import { ipcMain, shell, BrowserWindow } from "electron";
import { readFile, writeFile, copyFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { tmpdir } from "os";
import dotenv from "dotenv";
import { MEMORY_PATH, MEMORY_DIR, ENV_PATH } from "./paths.js";
import type { SessionBridge } from "./session-bridge.js";
import type { BookshelfWatcher } from "./bookshelf-watcher.js";
import type { TaskParser } from "./task-parser.js";
import type { VoiceHandler } from "./voice-handler.js";
import { respondDecision } from "./decision-bridge.js";
import { openReleaseUrl } from "./auto-updater.js";
import { getUsageStats, sendReportNow, checkUsageLimit } from "./usage-tracker.js";
import { getCrashReports, getRecentCrashCount } from "./crash-reporter.js";
import { getAnalyticsSummary, trackFeature } from "./feature-analytics.js";
import { exportLogs, exportLogsAndReveal } from "./log-exporter.js";

async function parseMemoryFile(): Promise<{
  name: string;
  identity: string;
  institution: string;
  researchField: string;
  advisor: string;
  project: string;
}> {
  const defaults = {
    name: "",
    identity: "",
    institution: "",
    researchField: "",
    advisor: "",
    project: "",
  };
  try {
    const content = await readFile(MEMORY_PATH, "utf-8");

    const fieldMap: Record<string, keyof typeof defaults> = {
      "姓名": "name",
      "身份": "identity",
      "单位": "institution",
      "研究领域": "researchField",
      "导师": "advisor",
    };

    for (const line of content.split("\n")) {
      const m = line.match(/^-\s*(.+?)：(.+)$/);
      if (m) {
        const key = fieldMap[m[1].trim()];
        if (key) defaults[key] = m[2].trim();
      }
    }

    // Extract project name
    const projMatch = content.match(/^-\s*项目：(.+)$/m);
    if (projMatch) defaults.project = projMatch[1].trim();
  } catch {
    // Memory file not found, return defaults
  }
  return defaults;
}

export function registerIpcHandlers(
  window: BrowserWindow,
  sessionBridge: SessionBridge,
  bookshelfWatcher: BookshelfWatcher,
  taskParser: TaskParser,
  voiceHandler: VoiceHandler
) {
  // ── Session channels ──
  ipcMain.handle("session:prompt", async (_event, { text, images }) => {
    if (!sessionBridge.isReady()) {
      throw new Error("会话尚未初始化，请稍等片刻再试");
    }
    await sessionBridge.prompt(text, images);
  });

  ipcMain.handle("session:steer", async (_event, { text }) => {
    if (!sessionBridge.isReady()) {
      throw new Error("会话尚未初始化，请稍等片刻再试");
    }
    await sessionBridge.steer(text);
  });

  ipcMain.handle("session:abort", async () => {
    sessionBridge.abort();
  });

  ipcMain.handle("session:getState", async () => {
    return sessionBridge.getState();
  });

  ipcMain.handle("model:list", async () => {
    if (!sessionBridge.isReady()) {
      return []; // Return empty list if not ready yet
    }
    return sessionBridge.getModels();
  });

  ipcMain.handle("model:set", async (_event, { modelId }) => {
    if (!sessionBridge.isReady()) {
      throw new Error("会话尚未初始化，请稍等片刻再试");
    }
    return sessionBridge.setModel(modelId);
  });

  // ── Decision channels ──
  ipcMain.handle("decision:respond", async (_event, { toolCallId, answer }) => {
    return respondDecision(toolCallId, answer);
  });

  // ── Setup channel ──
  ipcMain.handle("setup:submit", async (_event, config: {
    anthropicKey: string;
    minimaxKey?: string;
    dashscopeKey?: string;
    moonshotKey?: string;
  }) => {
    try {
      // Build .env content
      let envContent = `ANTHROPIC_API_KEY=${config.anthropicKey}\n`;
      if (config.minimaxKey) {
        envContent += `MINIMAX_API_KEY=${config.minimaxKey}\n`;
      }
      if (config.dashscopeKey) {
        envContent += `DASHSCOPE_API_KEY=${config.dashscopeKey}\n`;
      }
      if (config.moonshotKey) {
        envContent += `MOONSHOT_API_KEY=${config.moonshotKey}\n`;
      }

      // Ensure parent directory exists
      const envDir = path.dirname(ENV_PATH);
      if (!existsSync(envDir)) await mkdir(envDir, { recursive: true });

      // Write .env file
      await writeFile(ENV_PATH, envContent, "utf-8");

      // Reload env vars into process
      dotenv.config({ path: ENV_PATH, override: true });

      // Initialize session bridge now that keys are available
      await sessionBridge.initialize();

      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message || "Setup failed" };
    }
  });

  // ── File channels ──
  ipcMain.handle("file:open", async (_event, { path: filePath }) => {
    const ext = path.extname(filePath).toLowerCase();
    // PDF: copy to temp to avoid WPS file locking
    if (ext === ".pdf") {
      const tempDir = path.join(tmpdir(), "dsx-preview");
      if (!existsSync(tempDir)) await mkdir(tempDir, { recursive: true });
      const tempPath = path.join(tempDir, path.basename(filePath));
      try {
        await copyFile(filePath, tempPath);
        await shell.openPath(tempPath);
      } catch {
        await shell.openPath(filePath);
      }
    } else {
      await shell.openPath(filePath);
    }
  });

  ipcMain.handle("file:reveal", async (_event, { path: filePath }) => {
    shell.showItemInFolder(filePath);
  });

  // ── Bookshelf channels ──
  ipcMain.handle("bookshelf:getItems", async () => {
    return bookshelfWatcher.getItems();
  });

  // ── Task channels ──
  ipcMain.handle("task:getState", async () => {
    return taskParser.getState();
  });

  // ── User info channel ──
  ipcMain.handle("user:getInfo", async () => {
    return parseMemoryFile();
  });

  ipcMain.handle("user:updateInfo", async (_event, info: {
    name: string;
    identity: string;
    institution: string;
    researchField: string;
    advisor: string;
    project: string;
  }) => {
    try {
      if (!existsSync(MEMORY_DIR)) await mkdir(MEMORY_DIR, { recursive: true });
      let content = "";
      try {
        content = await readFile(MEMORY_PATH, "utf-8");
      } catch {
        // File doesn't exist yet
      }

      const fieldMap: Array<[string, string]> = [
        ["姓名", info.name],
        ["身份", info.identity],
        ["单位", info.institution],
        ["研究领域", info.researchField],
        ["导师", info.advisor],
        ["项目", info.project],
      ];

      // If file has content, update existing fields or append
      if (content.trim()) {
        for (const [label, value] of fieldMap) {
          const regex = new RegExp(`^(- ${label}：)(.*)$`, "m");
          if (regex.test(content)) {
            content = content.replace(regex, `$1${value}`);
          } else {
            // Find the "基本信息" section and append
            const sectionRegex = /^(## 基本信息\n)/m;
            if (sectionRegex.test(content)) {
              content = content.replace(sectionRegex, `$1- ${label}：${value}\n`);
            }
          }
        }
      } else {
        // Create new file with basic info section
        const lines = ["## 基本信息"];
        for (const [label, value] of fieldMap) {
          lines.push(`- ${label}：${value}`);
        }
        content = lines.join("\n") + "\n";
      }

      await writeFile(MEMORY_PATH, content, "utf-8");
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle("user:getAvatar", async () => {
    try {
      const avatarPath = path.join(MEMORY_DIR, "avatar.png");
      if (!existsSync(avatarPath)) return null;
      const buf = await readFile(avatarPath);
      return `data:image/png;base64,${buf.toString("base64")}`;
    } catch {
      return null;
    }
  });

  ipcMain.handle("user:setAvatar", async (_event, { data, mimeType }: { data: string; mimeType: string }) => {
    try {
      if (!existsSync(MEMORY_DIR)) await mkdir(MEMORY_DIR, { recursive: true });
      const avatarPath = path.join(MEMORY_DIR, "avatar.png");
      // Strip data URL prefix if present
      const base64Data = data.replace(/^data:[^;]+;base64,/, "");
      await writeFile(avatarPath, Buffer.from(base64Data, "base64"));
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  // ── Voice channels ──
  ipcMain.handle("voice:available", async () => {
    return voiceHandler.isAvailable();
  });

  ipcMain.handle("voice:start", async () => {
    return voiceHandler.start();
  });

  ipcMain.handle("voice:stop", async () => {
    return voiceHandler.stop();
  });

  ipcMain.handle("voice:cancel", async () => {
    voiceHandler.cancel();
  });

  // ── Window control channels ──
  ipcMain.handle("window:minimize", () => {
    window.minimize();
  });

  ipcMain.handle("window:maximize", () => {
    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }
  });

  ipcMain.handle("window:close", () => {
    window.close();
  });

  ipcMain.handle("window:isMaximized", () => {
    return window.isMaximized();
  });

  // ── Update channels ──
  ipcMain.handle("update:openUrl", async (_event, { url }) => {
    await openReleaseUrl(url);
  });

  // ── Usage channels ──
  ipcMain.handle("usage:getStats", async () => {
    return getUsageStats();
  });

  ipcMain.handle("usage:sendReport", async () => {
    sendReportNow();
  });

  ipcMain.handle("usage:checkLimit", async () => {
    return checkUsageLimit();
  });

  // ── Crash channels ──
  ipcMain.handle("crash:getReports", async () => {
    return getCrashReports();
  });

  ipcMain.handle("crash:getRecentCount", async (_event, days: number = 7) => {
    return getRecentCrashCount(days);
  });

  // ── Analytics channels ──
  ipcMain.handle("analytics:getSummary", async () => {
    return getAnalyticsSummary();
  });

  ipcMain.handle("analytics:track", async (_event, { feature, action, metadata }) => {
    trackFeature(feature, action, metadata);
  });

  // ── Log export channels ──
  ipcMain.handle("logs:export", async () => {
    return exportLogs();
  });

  ipcMain.handle("logs:exportAndReveal", async () => {
    return exportLogsAndReveal();
  });

  window.on("maximize", () => {
    window.webContents.send("window:maximized-change", true);
  });

  window.on("unmaximize", () => {
    window.webContents.send("window:maximized-change", false);
  });
}
