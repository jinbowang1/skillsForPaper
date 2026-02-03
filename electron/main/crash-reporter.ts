/**
 * Local crash and error reporting.
 * Captures uncaught exceptions, unhandled rejections, and renderer crashes.
 * Saves crash reports to LOGS_DIR/crashes/ for user to export when reporting bugs.
 */

import { app, BrowserWindow, crashReporter } from "electron";
import { mkdirSync, writeFileSync, readdirSync, statSync, readFileSync } from "fs";
import path from "path";
import { LOGS_DIR } from "./paths.js";
import { logger } from "./app-logger.js";

const CRASH_DIR = path.join(LOGS_DIR, "crashes");
const MAX_CRASH_FILES = 20;

export interface CrashReport {
  id: string;
  timestamp: string;
  type: "uncaughtException" | "unhandledRejection" | "rendererCrash" | "gpuCrash";
  message: string;
  stack?: string;
  appVersion: string;
  platform: string;
  arch: string;
}

let mainWindow: BrowserWindow | null = null;

export function initCrashReporter(window: BrowserWindow) {
  mainWindow = window;
  mkdirSync(CRASH_DIR, { recursive: true });

  // Handle uncaught exceptions in main process
  process.on("uncaughtException", (error) => {
    saveCrashReport({
      type: "uncaughtException",
      message: error.message,
      stack: error.stack,
    });
    logger.error(`[crash] Uncaught exception: ${error.message}`);
    // Don't exit - try to keep running
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (reason: any) => {
    const message = reason?.message || String(reason);
    const stack = reason?.stack;
    saveCrashReport({
      type: "unhandledRejection",
      message,
      stack,
    });
    logger.error(`[crash] Unhandled rejection: ${message}`);
  });

  // Handle renderer process crashes
  window.webContents.on("render-process-gone", (_event, details) => {
    saveCrashReport({
      type: "rendererCrash",
      message: `Renderer crashed: ${details.reason}`,
      stack: `Exit code: ${details.exitCode}`,
    });
    logger.error(`[crash] Renderer crashed: ${details.reason}`);

    // Notify user and offer to reload
    notifyCrash("渲染进程崩溃", "应用遇到问题，是否重新加载？");
  });

  // Handle GPU process crashes (deprecated but still supported)
  app.on("child-process-gone" as any, (_event: any, details: any) => {
    if (details.type === "GPU") {
      saveCrashReport({
        type: "gpuCrash",
        message: details.killed ? "GPU process was killed" : "GPU process crashed",
      });
      logger.error(`[crash] GPU process crashed (killed: ${details.killed})`);
    }
  });

  // Clean up old crash files
  cleanOldCrashFiles();

  logger.info("[crash] Crash reporter initialized");
}

function saveCrashReport(details: {
  type: CrashReport["type"];
  message: string;
  stack?: string;
}) {
  const report: CrashReport = {
    id: `crash_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    type: details.type,
    message: details.message,
    stack: details.stack,
    appVersion: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
  };

  const filePath = path.join(CRASH_DIR, `${report.id}.json`);
  try {
    writeFileSync(filePath, JSON.stringify(report, null, 2), "utf-8");
    logger.info(`[crash] Report saved: ${report.id}`);
  } catch (err) {
    logger.error(`[crash] Failed to save report: ${err}`);
  }
}

function cleanOldCrashFiles() {
  try {
    const files = readdirSync(CRASH_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => ({
        name: f,
        path: path.join(CRASH_DIR, f),
        mtime: statSync(path.join(CRASH_DIR, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.mtime - a.mtime);

    // Keep only the most recent MAX_CRASH_FILES
    if (files.length > MAX_CRASH_FILES) {
      const toDelete = files.slice(MAX_CRASH_FILES);
      for (const f of toDelete) {
        try {
          require("fs").unlinkSync(f.path);
        } catch {}
      }
    }
  } catch {}
}

function notifyCrash(title: string, message: string) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send("crash:notify", { title, message });
}

/** Get all crash reports for export */
export function getCrashReports(): CrashReport[] {
  try {
    const files = readdirSync(CRASH_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => path.join(CRASH_DIR, f));

    return files.map((f) => {
      try {
        return JSON.parse(readFileSync(f, "utf-8"));
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch {
    return [];
  }
}

/** Get crash count for the last N days */
export function getRecentCrashCount(days: number = 7): number {
  try {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const reports = getCrashReports();
    return reports.filter((r) => new Date(r.timestamp).getTime() > cutoff).length;
  } catch {
    return 0;
  }
}
