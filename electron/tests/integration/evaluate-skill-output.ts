/**
 * Automated evaluation of ECG/HRV analysis output.
 *
 * Task: ECG 生物信号处理与心率变异性 (HRV) 分析
 * (neurokit2 — ecg_simulate → R-peaks → HRV time/freq → images → PDF report)
 *
 * Scores output across 6 dimensions for a total of 100 points.
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

// ── Types ──

export interface ScoreCategory {
  name: string;
  nameCn: string;
  maxScore: number;
  score: number;
  details: string[];
}

export interface EvaluationResult {
  modelId: string;
  modelName: string;
  categories: ScoreCategory[];
  totalScore: number;
  maxTotalScore: number;
  wordCount: number;
  charCount: number;
  filePath: string;
  generatedFiles: string[];
}

// ── PDF Text Extraction ──

/** Extract text from a PDF file using available system tools */
function extractPdfText(pdfPath: string): string {
  // Method 1: pdftotext (poppler — `brew install poppler` on macOS)
  try {
    return execSync(`pdftotext "${pdfPath}" - 2>/dev/null`, {
      encoding: "utf-8",
      timeout: 10_000,
    }).trim();
  } catch {
    /* not available */
  }

  // Method 2: Python with PDF libraries
  const pyScript = `/tmp/_pdf_extract_${process.pid}.py`;
  const pyCode = `import sys
text = ""
try:
    import fitz
    doc = fitz.open(sys.argv[1])
    for page in doc: text += page.get_text()
except ImportError:
    try:
        from PyPDF2 import PdfReader
        reader = PdfReader(sys.argv[1])
        for page in reader.pages: text += (page.extract_text() or "")
    except ImportError:
        try:
            import pdfplumber
            with pdfplumber.open(sys.argv[1]) as pdf:
                for page in pdf.pages: text += (page.extract_text() or "")
        except ImportError: pass
print(text)`;

  try {
    fs.writeFileSync(pyScript, pyCode);
    return execSync(`python3 "${pyScript}" "${pdfPath}" 2>/dev/null`, {
      encoding: "utf-8",
      timeout: 15_000,
    }).trim();
  } catch {
    return "";
  } finally {
    try {
      fs.unlinkSync(pyScript);
    } catch {
      /* ignore */
    }
  }
}

// ── Python Source Analysis ──

interface CodeAnalysis {
  usesNeurokit: boolean;
  usesEcgSimulate: boolean;
  usesEcgProcess: boolean;
  usesEcgPeaks: boolean;
  usesHrvTime: boolean;
  usesHrvFrequency: boolean;
  usesMatplotlib: boolean;
  mentionsSR1000: boolean;
  mentionsDuration300: boolean;
  mentionsHR70: boolean;
}

function analyzePythonCode(
  modelDir: string,
  generatedFiles: string[],
): CodeAnalysis {
  let code = "";
  for (const rel of generatedFiles.filter((f) => f.endsWith(".py"))) {
    const fp = path.join(modelDir, rel);
    if (fs.existsSync(fp)) code += "\n" + fs.readFileSync(fp, "utf-8");
  }
  return {
    usesNeurokit: /import\s+neurokit2|from\s+neurokit2/.test(code),
    usesEcgSimulate: /ecg_simulate/.test(code),
    usesEcgProcess: /ecg_process/.test(code),
    usesEcgPeaks: /ecg_peaks|ecg_findpeaks|find_peaks/.test(code),
    usesHrvTime: /hrv_time|hrv\(/.test(code),
    usesHrvFrequency: /hrv_frequency/.test(code),
    usesMatplotlib: /import\s+matplotlib|from\s+matplotlib|plt\./.test(code),
    mentionsSR1000: /sampling_rate\s*=\s*1000/.test(code),
    mentionsDuration300: /duration\s*=\s*300|5\s*\*\s*60/.test(code),
    mentionsHR70: /heart_rate\s*=\s*70/.test(code),
  };
}

// ── Text Utilities ──

/** Case-insensitive keyword presence check */
function has(text: string, ...keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

/** Find a number near any of the given keywords in the text */
function findNumberNear(
  text: string,
  keywords: string[],
  maxDist = 300,
): number | null {
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    let pos = 0;
    while (pos < lower.length) {
      const idx = lower.indexOf(kw.toLowerCase(), pos);
      if (idx === -1) break;
      const window = text.substring(
        idx + kw.length,
        idx + kw.length + maxDist,
      );
      const m = window.match(/[:\s=≈~]*(-?\d+\.?\d*)/);
      if (m) {
        const val = parseFloat(m[1]);
        if (!isNaN(val) && val >= 0) return val;
      }
      pos = idx + 1;
    }
  }
  return null;
}

/** Gather all readable text from model output (PDF + md + json + csv) */
function gatherAllText(
  modelDir: string,
  generatedFiles: string[],
  pdfText: string,
): string {
  let all = pdfText;
  for (const rel of generatedFiles) {
    if (rel.endsWith(".md") && !rel.includes("TASK")) {
      const fp = path.join(modelDir, rel);
      if (fs.existsSync(fp)) all += "\n" + fs.readFileSync(fp, "utf-8");
    }
    if (/\.(json|csv|txt)$/i.test(rel)) {
      const fp = path.join(modelDir, rel);
      if (fs.existsSync(fp)) {
        const c = fs.readFileSync(fp, "utf-8");
        if (c.length < 100_000) all += "\n" + c;
      }
    }
  }
  return all;
}

// ── Main Evaluation ──

export function evaluateOutput(
  modelId: string,
  modelName: string,
  generatedFiles: string[],
  modelDir: string,
): EvaluationResult {
  const categories: ScoreCategory[] = [];

  // ── Identify files ──
  const pdfFiles = generatedFiles.filter((f) =>
    f.toLowerCase().endsWith(".pdf"),
  );
  const imgFiles = generatedFiles.filter((f) =>
    /\.(png|jpg|jpeg|svg|gif)$/i.test(f),
  );
  const pdfPath = pdfFiles[0] ? path.join(modelDir, pdfFiles[0]) : null;
  let pdfText = "";
  let pdfSize = 0;
  if (pdfPath && fs.existsSync(pdfPath)) {
    pdfSize = fs.statSync(pdfPath).size;
    pdfText = extractPdfText(pdfPath);
  }

  const allText = gatherAllText(modelDir, generatedFiles, pdfText);
  const code = analyzePythonCode(modelDir, generatedFiles);

  // ━━ 1. ECG 信号生成 (15 pts) ━━
  {
    let s = 0;
    const d: string[] = [];

    if (code.usesNeurokit) {
      s += 5;
      d.push("  [+5] 使用了 neurokit2");
    } else {
      d.push("  [  0] 未检测到 neurokit2");
    }
    if (code.usesEcgSimulate) {
      s += 4;
      d.push("  [+4] 调用 ecg_simulate()");
    } else if (has(allText, "ecg_simulate")) {
      s += 2;
      d.push("  [+2] 提及 ecg_simulate");
    } else {
      d.push("  [  0] 未使用 ecg_simulate");
    }
    if (
      code.mentionsSR1000 ||
      has(allText, "1000 hz", "1000hz", "采样率 1000", "sampling_rate=1000")
    ) {
      s += 2;
      d.push("  [+2] 采样率 1000 Hz ✓");
    }
    if (
      code.mentionsDuration300 ||
      has(allText, "5 分钟", "5 min", "300 s", "300秒", "5分钟")
    ) {
      s += 2;
      d.push("  [+2] 时长 5 分钟 ✓");
    }
    if (
      code.mentionsHR70 ||
      has(allText, "70 bpm", "心率 70", "70bpm", "heart_rate=70", "心率70")
    ) {
      s += 2;
      d.push("  [+2] 心率 70 BPM ✓");
    }

    categories.push({
      name: "Signal",
      nameCn: "信号生成",
      score: Math.min(s, 15),
      maxScore: 15,
      details: d,
    });
  }

  // ━━ 2. 信号处理 (15 pts) ━━
  {
    let s = 0;
    const d: string[] = [];

    if (code.usesEcgProcess) {
      s += 4;
      d.push("  [+4] 调用 ecg_process()");
    } else if (code.usesEcgPeaks) {
      s += 3;
      d.push("  [+3] 调用 ecg_peaks/findpeaks");
    } else if (has(allText, "ecg_process", "ecg_peaks")) {
      s += 1;
      d.push("  [+1] 提及处理函数");
    } else {
      d.push("  [  0] 未使用信号处理函数");
    }

    // R-peak count
    const peakPatterns = [
      /(\d{2,4})\s*(?:个?\s*R[- ]?peaks?|R波|个峰)/i,
      /R[- ]?peaks?\s*[:：]?\s*(\d{2,4})/i,
      /检测到\s*(\d{2,4})/,
      /detected\s+(\d{2,4})/i,
    ];
    let peakCount: number | null = null;
    for (const pat of peakPatterns) {
      const m = allText.match(pat);
      if (m) {
        peakCount = parseInt(m[1]);
        break;
      }
    }
    if (peakCount && peakCount >= 300 && peakCount <= 400) {
      s += 5;
      d.push(`  [+5] R-peak 计数 ${peakCount} ✓ (300-400)`);
    } else if (peakCount && peakCount > 0) {
      s += 2;
      d.push(`  [+2] R-peak 计数 ${peakCount} (偏离预期)`);
    } else if (has(allText, "r-peak", "r peak", "r_peak", "R波", "R-peaks")) {
      s += 2;
      d.push("  [+2] 提及 R-peak");
    } else {
      d.push("  [  0] 未提及 R-peak");
    }

    if (has(allText, "filter", "滤波", "bandpass", "clean", "去噪")) {
      s += 3;
      d.push("  [+3] 提及滤波/去噪");
    }
    if (has(allText, "quality", "质量评估", "信号质量")) {
      s += 3;
      d.push("  [+3] 提及信号质量");
    }

    categories.push({
      name: "Processing",
      nameCn: "信号处理",
      score: Math.min(s, 15),
      maxScore: 15,
      details: d,
    });
  }

  // ━━ 3. 时域 HRV (20 pts) ━━
  {
    let s = 0;
    const d: string[] = [];

    if (code.usesHrvTime) {
      s += 2;
      d.push("  [+2] 调用 hrv_time()");
    }

    // Mean RR
    const meanRR = findNumberNear(allText, [
      "mean rr",
      "mean_rr",
      "meanrr",
      "平均rr",
      "mean nn",
      "平均nn",
      "mean_nn",
    ]);
    if (meanRR && meanRR >= 750 && meanRR <= 950) {
      s += 5;
      d.push(`  [+5] Mean RR = ${meanRR} ms ✓`);
    } else if (meanRR) {
      s += 2;
      d.push(`  [+2] Mean RR = ${meanRR} ms (偏离)`);
    } else if (has(allText, "mean rr", "mean nn", "平均rr")) {
      s += 1;
      d.push("  [+1] 提及 Mean RR");
    } else {
      d.push("  [  0] 未找到 Mean RR");
    }

    // SDNN
    const sdnn = findNumberNear(allText, ["sdnn"]);
    if (sdnn && sdnn >= 10 && sdnn <= 300) {
      s += 5;
      d.push(`  [+5] SDNN = ${sdnn} ms ✓`);
    } else if (sdnn) {
      s += 2;
      d.push(`  [+2] SDNN = ${sdnn} ms (偏离)`);
    } else if (has(allText, "sdnn")) {
      s += 1;
      d.push("  [+1] 提及 SDNN");
    } else {
      d.push("  [  0] 未找到 SDNN");
    }

    // RMSSD
    const rmssd = findNumberNear(allText, ["rmssd"]);
    if (rmssd && rmssd >= 5 && rmssd <= 200) {
      s += 4;
      d.push(`  [+4] RMSSD = ${rmssd} ms ✓`);
    } else if (rmssd) {
      s += 1;
      d.push(`  [+1] RMSSD = ${rmssd} ms (偏离)`);
    } else if (has(allText, "rmssd")) {
      s += 1;
      d.push("  [+1] 提及 RMSSD");
    } else {
      d.push("  [  0] 未找到 RMSSD");
    }

    // pNN50
    const pnn50 = findNumberNear(allText, ["pnn50"]);
    if (pnn50 !== null && pnn50 >= 0 && pnn50 <= 60) {
      s += 4;
      d.push(`  [+4] pNN50 = ${pnn50}% ✓`);
    } else if (pnn50 !== null) {
      s += 1;
      d.push(`  [+1] pNN50 = ${pnn50}% (偏离)`);
    } else if (has(allText, "pnn50")) {
      s += 1;
      d.push("  [+1] 提及 pNN50");
    } else {
      d.push("  [  0] 未找到 pNN50");
    }

    categories.push({
      name: "TimeDomain",
      nameCn: "时域 HRV",
      score: Math.min(s, 20),
      maxScore: 20,
      details: d,
    });
  }

  // ━━ 4. 频域 HRV (20 pts) ━━
  {
    let s = 0;
    const d: string[] = [];

    if (code.usesHrvFrequency) {
      s += 2;
      d.push("  [+2] 调用 hrv_frequency()");
    }

    // LF power
    if (
      has(
        allText,
        "lf power",
        "lf 功率",
        "低频功率",
        "low frequency power",
      ) ||
      findNumberNear(allText, ["lf power", "lf_power", "低频功率"]) !== null
    ) {
      s += 5;
      d.push("  [+5] 报告了 LF 功率");
    } else if (has(allText, "lf") && has(allText, "ms²", "ms2", "power")) {
      s += 3;
      d.push("  [+3] 可能包含 LF 数据");
    } else {
      d.push("  [  0] 未找到 LF 功率");
    }

    // HF power
    if (
      has(
        allText,
        "hf power",
        "hf 功率",
        "高频功率",
        "high frequency power",
      ) ||
      findNumberNear(allText, ["hf power", "hf_power", "高频功率"]) !== null
    ) {
      s += 5;
      d.push("  [+5] 报告了 HF 功率");
    } else if (has(allText, "hf") && has(allText, "ms²", "ms2", "power")) {
      s += 3;
      d.push("  [+3] 可能包含 HF 数据");
    } else {
      d.push("  [  0] 未找到 HF 功率");
    }

    // LF/HF ratio
    const lfhf = findNumberNear(allText, ["lf/hf", "lf_hf", "lfhf"]);
    if (lfhf && lfhf >= 0.1 && lfhf <= 10) {
      s += 5;
      d.push(`  [+5] LF/HF = ${lfhf} ✓`);
    } else if (lfhf) {
      s += 2;
      d.push(`  [+2] LF/HF = ${lfhf} (偏离)`);
    } else if (has(allText, "lf/hf", "lf_hf")) {
      s += 2;
      d.push("  [+2] 提及 LF/HF");
    } else {
      d.push("  [  0] 未找到 LF/HF");
    }

    // VLF
    if (has(allText, "vlf", "very low frequency", "极低频")) {
      s += 3;
      d.push("  [+3] 提及 VLF");
    }

    categories.push({
      name: "FreqDomain",
      nameCn: "频域 HRV",
      score: Math.min(s, 20),
      maxScore: 20,
      details: d,
    });
  }

  // ━━ 5. 可视化 (15 pts) ━━
  {
    let s = 0;
    const d: string[] = [];
    const imgCount = Math.min(imgFiles.length, 3);

    if (imgCount > 0) {
      s = imgCount * 5;
      d.push(`  [+${s}] 生成了 ${imgFiles.length} 个图片文件`);
      for (const img of imgFiles) d.push(`        └─ ${img}`);
    } else if (pdfSize > 500_000) {
      s = 10;
      d.push(
        `  [+10] 无独立图片，但 PDF 较大 (${(pdfSize / 1024).toFixed(0)} KB)，可能内嵌图表`,
      );
    } else if (pdfSize > 100_000) {
      s = 5;
      d.push(
        `  [+5] 无独立图片，PDF 中等大小 (${(pdfSize / 1024).toFixed(0)} KB)`,
      );
    } else {
      d.push("  [  0] 未生成图片文件");
    }

    categories.push({
      name: "Images",
      nameCn: "可视化",
      score: Math.min(s, 15),
      maxScore: 15,
      details: d,
    });
  }

  // ━━ 6. PDF 报告 (15 pts) ━━
  {
    let s = 0;
    const d: string[] = [];

    if (pdfPath && fs.existsSync(pdfPath)) {
      s += 5;
      d.push(`  [+5] PDF 文件存在: ${pdfFiles[0]}`);
      if (pdfSize > 10_240) {
        s += 5;
        d.push(
          `  [+5] PDF 大小 ${(pdfSize / 1024).toFixed(1)} KB (>10KB)`,
        );
      } else if (pdfSize > 1_024) {
        s += 2;
        d.push(
          `  [+2] PDF 较小: ${(pdfSize / 1024).toFixed(1)} KB`,
        );
      } else {
        d.push(`  [  0] PDF 过小: ${pdfSize} bytes`);
      }
      if (
        pdfText.length > 100 &&
        has(pdfText, "hrv", "ecg", "心率", "r-peak", "sdnn")
      ) {
        s += 5;
        d.push("  [+5] PDF 含 HRV/ECG 文本内容");
      } else if (pdfText.length > 50) {
        s += 2;
        d.push("  [+2] PDF 含文本但缺少关键术语");
      } else {
        d.push("  [  0] PDF 无可提取文本");
      }
    } else {
      d.push("  [  0] 未生成 PDF 文件");
    }

    categories.push({
      name: "PDF",
      nameCn: "PDF 报告",
      score: Math.min(s, 15),
      maxScore: 15,
      details: d,
    });
  }

  // ── Totals ──
  const totalScore = categories.reduce((acc, c) => acc + c.score, 0);
  const maxTotalScore = categories.reduce((acc, c) => acc + c.maxScore, 0);

  return {
    modelId,
    modelName,
    categories,
    totalScore,
    maxTotalScore,
    wordCount: pdfText.split(/\s+/).filter(Boolean).length,
    charCount: pdfText.length,
    filePath: pdfPath ?? "(no PDF)",
    generatedFiles,
  };
}

// ── Comparison Report ──

export function generateComparisonReport(results: EvaluationResult[]): string {
  const lines: string[] = [];
  const now = new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" });

  lines.push("# ECG/HRV 分析 — 多模型对比评测报告");
  lines.push("");
  lines.push(`**评测时间**: ${now}`);
  lines.push(
    "**评测主题**: ECG 生物信号处理与心率变异性 (HRV) 分析 (neurokit2 + PDF 输出)",
  );
  lines.push(`**参评模型**: ${results.map((r) => r.modelName).join(", ")}`);
  lines.push("");

  // ── Summary table ──
  lines.push("## 总分对比");
  lines.push("");
  lines.push(
    "| 模型 | 总分 | 信号生成(15) | 信号处理(15) | 时域HRV(20) | 频域HRV(20) | 可视化(15) | PDF(15) | 文件数 |",
  );
  lines.push(
    "|------|------|------------|------------|-----------|-----------|---------|-------|--------|",
  );

  const sorted = [...results].sort((a, b) => b.totalScore - a.totalScore);

  for (const r of sorted) {
    const cats = r.categories;
    const row = [
      `**${r.modelName}**`,
      `**${r.totalScore}/${r.maxTotalScore}**`,
      ...cats.map((c) => `${c.score}/${c.maxScore}`),
      String(r.generatedFiles.length),
    ];
    lines.push(`| ${row.join(" | ")} |`);
  }
  lines.push("");

  // ── Ranking ──
  lines.push("## 排名");
  lines.push("");
  const medals = ["🥇", "🥈", "🥉"];
  for (let i = 0; i < sorted.length; i++) {
    const r = sorted[i];
    const pct = ((r.totalScore / r.maxTotalScore) * 100).toFixed(1);
    const imgCount = r.generatedFiles.filter((f) =>
      /\.(png|jpg|jpeg|svg|gif)$/i.test(f),
    ).length;
    const hasPdf = r.generatedFiles.some((f) =>
      f.toLowerCase().endsWith(".pdf"),
    );
    const prefix = i < 3 ? `${medals[i]} ` : `${i + 1}. `;
    lines.push(
      `${prefix}**${r.modelName}** — ${r.totalScore}/${r.maxTotalScore} (${pct}%) | PDF: ${hasPdf ? "✓" : "✗"} | 图片: ${imgCount}`,
    );
  }
  lines.push("");

  // ── Per-model detail ──
  lines.push("## 各模型详细评分");
  lines.push("");

  for (const r of sorted) {
    lines.push(`### ${r.modelName} (\`${r.modelId}\`)`);
    lines.push("");
    lines.push(`- **总分**: ${r.totalScore}/${r.maxTotalScore}`);
    lines.push(
      `- **PDF 文本字数**: ${r.wordCount} | 字符数: ${r.charCount}`,
    );
    lines.push(`- **输出文件**: \`${r.filePath}\``);
    lines.push(`- **生成文件数**: ${r.generatedFiles.length}`);
    if (r.generatedFiles.length > 0) {
      lines.push(`- **文件列表**: ${r.generatedFiles.join(", ")}`);
    }
    lines.push("");

    for (const cat of r.categories) {
      lines.push(
        `#### ${cat.nameCn} (${cat.name}): ${cat.score}/${cat.maxScore}`,
      );
      lines.push("");
      for (const d of cat.details) lines.push(d);
      lines.push("");
    }

    lines.push("---");
    lines.push("");
  }

  // ── Methodology ──
  lines.push("## 评分方法说明");
  lines.push("");
  lines.push("本报告采用自动化评分，基于以下 6 个维度 (满分 100 分)：");
  lines.push("");
  lines.push("| 维度 | 满分 | 评分依据 |");
  lines.push("|------|------|---------|");
  lines.push(
    "| 信号生成 | 15 | 是否使用 neurokit2 的 ecg_simulate()，参数是否匹配 (1000Hz/5min/70BPM) |",
  );
  lines.push(
    "| 信号处理 | 15 | R-peak 检测方法与计数、滤波/去噪处理、信号质量评估 |",
  );
  lines.push(
    "| 时域 HRV | 20 | Mean RR / SDNN / RMSSD / pNN50 数值是否在生理合理范围内 |",
  );
  lines.push(
    "| 频域 HRV | 20 | LF / HF / LF/HF ratio / VLF 报告完整性与数值合理性 |",
  );
  lines.push(
    "| 可视化 | 15 | 是否生成 PNG 图片（ECG波形、RR序列、PSD），每张 5 分 |",
  );
  lines.push(
    "| PDF 报告 | 15 | PDF 文件是否存在、大小是否合理 (>10KB)、是否含可提取文本 |",
  );
  lines.push("");
  lines.push(
    "> **关键说明**: neurokit2 是一个相对小众的生物信号处理库，PDF 生成额外考验模型对文档工具的掌握。",
  );
  lines.push(
    "> 不阅读 skills 的模型在信号生成/HRV 分析/PDF 输出三项上预期会失分。",
  );

  return lines.join("\n");
}
