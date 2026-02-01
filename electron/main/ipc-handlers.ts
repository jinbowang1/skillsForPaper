import { ipcMain, shell, BrowserWindow } from "electron";
import { readFileSync } from "fs";
import { join } from "path";
import type { SessionBridge } from "./session-bridge.js";
import type { BookshelfWatcher } from "./bookshelf-watcher.js";
import type { TaskParser } from "./task-parser.js";
import type { VoiceHandler } from "./voice-handler.js";

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
    const memoryPath = join(__dirname, "..", "..", "..", "memory", "MEMORY.md");
    const content = readFileSync(memoryPath, "utf-8");

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

  // ── File channels ──
  ipcMain.handle("file:open", async (_event, { path: filePath }) => {
    await shell.openPath(filePath);
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
}
