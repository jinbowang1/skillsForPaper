/**
 * Skill Model Comparison — End-to-End Integration Test
 *
 * ECG/HRV Analysis task: sends a neurokit2-based analysis prompt to each
 * configured model, collects all generated files (PDF + images + code), scores
 * them automatically, and produces a comparison report.
 *
 * KEY: Task isolation — output directory is cleaned before each model run.
 *
 * Usage:
 *   npx playwright test --config=playwright-integration.config.ts skill-model-comparison
 *
 * Env overrides:
 *   TEST_MODELS  — comma-separated model IDs (default: all 4 registered models)
 *   TEST_PROMPT  — override the default prompt
 */

import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import {
  launchApp,
  sendPrompt,
  waitForIdle,
  autoRespondDecisions,
  switchModel,
} from "./helpers";
import type { ElectronApplication } from "@playwright/test";
import {
  evaluateOutput,
  generateComparisonReport,
  type EvaluationResult,
} from "./evaluate-skill-output";

// ── Configuration ──

const MODELS = (
  process.env.TEST_MODELS ??
  "claude-opus-4-5,MiniMax-M2.1,qwen3-max,kimi-k2.5"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const MODEL_NAMES: Record<string, string> = {
  "claude-opus-4-5": "Claude Opus 4.5",
  "MiniMax-M2.1": "MiniMax M2.1",
  "qwen3-max": "Qwen3 Max",
  "kimi-k2.5": "Kimi K2.5",
};

const PROJECT_ROOT = path.resolve(__dirname, "../../..");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "output");
const COMPARISON_DIR = path.join(OUTPUT_DIR, "model-comparison");

const DEFAULT_PROMPT = `请使用 neurokit2 完成以下 ECG 生物信号分析任务。最终报告必须是 PDF 格式（不要生成 Markdown），直接输出 PDF 文件到 output 目录。

请通过实际编写 Python 代码执行分析，不要估算数值：

1. 生成合成 ECG 信号（采样率 1000 Hz，时长 5 分钟，平均心率 70 BPM，随机种子 42）
2. 对信号进行预处理：滤波去噪、R-peak 检测、信号质量评估
3. 计算时域 HRV 指标：Mean RR (ms)、SDNN (ms)、RMSSD (ms)、pNN50 (%)
4. 计算频域 HRV 指标：VLF (ms²)、LF (ms²)、HF (ms²)、LF/HF ratio
5. 生成 3 张可视化图表（分别保存为 PNG 文件到 output 目录，同时嵌入 PDF 报告中）：
   - ECG 波形图（标注 R-peaks 位置）
   - RR 间期时间序列图
   - HRV 功率谱密度图
6. 将所有分析结果整理为 PDF 报告，包含参数说明、指标汇总表格、图表和结果解读，保存到 output 目录`;

const PROMPT = process.env.TEST_PROMPT ?? DEFAULT_PROMPT;

/** Per-model generation timeout (ms) — 10 minutes for complex tasks */
const MODEL_TIMEOUT = 600_000;

// ── Helpers ──

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Clean the output directory (recursive) while preserving model-comparison/.
 * This provides task isolation between model runs.
 */
function cleanOutputForRun(): void {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    return;
  }
  for (const entry of fs.readdirSync(OUTPUT_DIR, { withFileTypes: true })) {
    if (entry.name === "model-comparison") continue;
    if (entry.name === ".gitkeep") continue;
    const fullPath = path.join(OUTPUT_DIR, entry.name);
    if (entry.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(fullPath);
    }
  }
}

/**
 * Recursively collect all generated files from the output directory,
 * excluding the model-comparison/ folder and .gitkeep.
 * Returns relative paths from OUTPUT_DIR.
 */
function collectOutputFiles(): string[] {
  const relPaths: string[] = [];

  function scan(dir: string) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "model-comparison") continue;
      if (entry.name === ".gitkeep") continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(fullPath);
      } else {
        relPaths.push(path.relative(OUTPUT_DIR, fullPath));
      }
    }
  }

  scan(OUTPUT_DIR);
  return relPaths;
}

/**
 * Copy all collected files into the model-specific comparison directory.
 * Preserves relative directory structure.
 */
function copyFilesToComparison(modelId: string, relPaths: string[]): void {
  const modelDir = path.join(COMPARISON_DIR, modelId);
  fs.mkdirSync(modelDir, { recursive: true });

  for (const rel of relPaths) {
    const src = path.join(OUTPUT_DIR, rel);
    const dest = path.join(modelDir, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

/** Path for persisting results to disk (survives worker restarts) */
const RESULTS_JSON = path.join(COMPARISON_DIR, "_results.json");

/** Save a single result to the persistent JSON file on disk */
function persistResult(result: EvaluationResult): void {
  let existing: EvaluationResult[] = [];
  if (fs.existsSync(RESULTS_JSON)) {
    try {
      existing = JSON.parse(fs.readFileSync(RESULTS_JSON, "utf-8"));
    } catch {
      /* corrupted file, start fresh */
    }
  }
  // Replace existing entry for same model, or append
  const idx = existing.findIndex((r) => r.modelId === result.modelId);
  if (idx >= 0) existing[idx] = result;
  else existing.push(result);
  fs.writeFileSync(RESULTS_JSON, JSON.stringify(existing, null, 2), "utf-8");
}

/** Load all persisted results from disk */
function loadResults(): EvaluationResult[] {
  if (!fs.existsSync(RESULTS_JSON)) return [];
  try {
    return JSON.parse(fs.readFileSync(RESULTS_JSON, "utf-8"));
  } catch {
    return [];
  }
}

/** Run a single model: launch app, send prompt, collect output, evaluate */
async function runModel(modelId: string): Promise<EvaluationResult> {
  const modelName = MODEL_NAMES[modelId] || modelId;
  let app: ElectronApplication | null = null;
  let stopAutoRespond: (() => void) | null = null;

  const emptyResult: EvaluationResult = {
    modelId,
    modelName,
    categories: [],
    totalScore: 0,
    maxTotalScore: 100,
    wordCount: 0,
    charCount: 0,
    filePath: "(no output)",
    generatedFiles: [],
  };

  try {
    // ── Task Isolation: clean output before this model ──
    cleanOutputForRun();

    const launched = await launchApp();
    app = launched.app;
    const page = launched.page;
    stopAutoRespond = autoRespondDecisions(page);

    // Switch to target model — may fail if session not ready
    try {
      await switchModel(page, modelId);
    } catch (err) {
      console.error(`[${modelId}] switchModel failed: ${err}`);
      persistResult(emptyResult);
      return emptyResult;
    }

    // Send the ECG/HRV analysis prompt
    await sendPrompt(page, PROMPT);

    // Wait for agent to finish — timeout is non-fatal
    try {
      await waitForIdle(page, MODEL_TIMEOUT);
    } catch {
      console.warn(
        `[${modelId}] waitForIdle timed out, checking for partial output...`,
      );
    }

    // Extra wait for filesystem flush
    await sleep(5_000);

    // Collect all generated files
    const relPaths = collectOutputFiles();
    console.log(
      `[${modelId}] Generated ${relPaths.length} files: ${relPaths.join(", ") || "(none)"}`,
    );

    // Copy everything to comparison directory
    if (relPaths.length > 0) {
      copyFilesToComparison(modelId, relPaths);
    }

    // Evaluate output — works even without PDF (partial scoring)
    const modelDir = path.join(COMPARISON_DIR, modelId);
    const result = evaluateOutput(modelId, modelName, relPaths, modelDir);

    console.log(
      `[${modelId}] Score: ${result.totalScore}/${result.maxTotalScore}`,
    );
    if (result.filePath !== "(no PDF)") {
      console.log(`[${modelId}] PDF: ${result.filePath}`);
    } else {
      console.log(`[${modelId}] No PDF produced`);
    }

    persistResult(result);
    return result;
  } catch (err) {
    // Catch-all: persist a zero-score result so the report still includes this model
    console.error(`[${modelId}] Fatal error: ${err}`);
    persistResult(emptyResult);
    return emptyResult;
  } finally {
    stopAutoRespond?.();
    if (app) await app.close().catch(() => {});
  }
}

// ── Test suite ──

test.describe("ECG/HRV 分析 — 多模型对比评测", () => {
  test.beforeAll(() => {
    fs.mkdirSync(COMPARISON_DIR, { recursive: true });
    // Clear stale results from a previous run
    if (fs.existsSync(RESULTS_JSON)) fs.unlinkSync(RESULTS_JSON);
  });

  // One test per model — each gets a fresh Electron app + clean output dir
  for (const modelId of MODELS) {
    test(`生成: ${MODEL_NAMES[modelId] || modelId}`, async () => {
      test.setTimeout(MODEL_TIMEOUT + 180_000);

      console.log(`\n${"=".repeat(60)}`);
      console.log(
        `  Model: ${MODEL_NAMES[modelId] || modelId} (${modelId})`,
      );
      console.log(`${"=".repeat(60)}`);

      await runModel(modelId);
    });
  }

  // Final evaluation and report generation — reads persisted results from disk
  test("生成对比评测报告", async () => {
    test.setTimeout(30_000);

    console.log(`\n${"=".repeat(60)}`);
    console.log("  Generating comparison report");
    console.log(`${"=".repeat(60)}`);

    const allResults = loadResults();
    expect(
      allResults.length,
      "Should have results to compare",
    ).toBeGreaterThan(0);

    const report = generateComparisonReport(allResults);
    const reportPath = path.join(COMPARISON_DIR, "comparison-report.md");
    fs.writeFileSync(reportPath, report, "utf-8");

    console.log(`\nReport saved: ${reportPath}`);

    // Print summary to console
    console.log("\n--- QUICK SUMMARY ---");
    const sorted = [...allResults].sort(
      (a, b) => b.totalScore - a.totalScore,
    );
    for (let i = 0; i < sorted.length; i++) {
      const r = sorted[i];
      const pct = ((r.totalScore / r.maxTotalScore) * 100).toFixed(1);
      const imgCount = r.generatedFiles.filter((f) =>
        /\.(png|jpg|jpeg|svg|gif)$/i.test(f),
      ).length;
      const hasPdf = r.generatedFiles.some((f) =>
        f.toLowerCase().endsWith(".pdf"),
      );
      console.log(
        `  #${i + 1}  ${r.modelName.padEnd(20)} ${r.totalScore}/${r.maxTotalScore} (${pct}%) | PDF: ${hasPdf ? "✓" : "✗"} | imgs: ${imgCount} | files: ${r.generatedFiles.length}`,
      );
    }

    expect(fs.existsSync(reportPath)).toBe(true);
  });
});
