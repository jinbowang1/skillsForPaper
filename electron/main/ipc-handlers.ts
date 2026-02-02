import { ipcMain, shell, BrowserWindow } from "electron";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { copyFileSync, mkdirSync, existsSync } from "fs";
import { tmpdir } from "os";
import dotenv from "dotenv";
import { MEMORY_PATH, ENV_PATH } from "./paths.js";
import type { SessionBridge } from "./session-bridge.js";
import type { BookshelfWatcher } from "./bookshelf-watcher.js";
import type { TaskParser } from "./task-parser.js";
import type { VoiceHandler } from "./voice-handler.js";
import { respondDecision } from "./decision-bridge.js";

function parseMemoryFile(): {
  name: string;
  identity: string;
  institution: string;
  researchField: string;
  advisor: string;
  project: string;
} {
  const defaults = {
    name: "",
    identity: "",
    institution: "",
    researchField: "",
    advisor: "",
    project: "",
  };
  try {
    const content = readFileSync(MEMORY_PATH, "utf-8");

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
    await sessionBridge.prompt(text, images);
  });

  ipcMain.handle("session:steer", async (_event, { text }) => {
    await sessionBridge.steer(text);
  });

  ipcMain.handle("session:abort", async () => {
    sessionBridge.abort();
  });

  ipcMain.handle("session:getState", async () => {
    return sessionBridge.getState();
  });

  ipcMain.handle("model:list", async () => {
    return sessionBridge.getModels();
  });

  ipcMain.handle("model:set", async (_event, { modelId }) => {
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
      if (!existsSync(envDir)) mkdirSync(envDir, { recursive: true });

      // Write .env file
      writeFileSync(ENV_PATH, envContent, "utf-8");

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
      if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });
      const tempPath = path.join(tempDir, path.basename(filePath));
      try {
        copyFileSync(filePath, tempPath);
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

  window.on("maximize", () => {
    window.webContents.send("window:maximized-change", true);
  });

  window.on("unmaximize", () => {
    window.webContents.send("window:maximized-change", false);
  });
}
