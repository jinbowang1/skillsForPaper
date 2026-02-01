import { ipcMain, shell, BrowserWindow } from "electron";
import type { SessionBridge } from "./session-bridge.js";
import type { BookshelfWatcher } from "./bookshelf-watcher.js";
import type { TaskParser } from "./task-parser.js";

export function registerIpcHandlers(
  window: BrowserWindow,
  sessionBridge: SessionBridge,
  bookshelfWatcher: BookshelfWatcher,
  taskParser: TaskParser
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
}
