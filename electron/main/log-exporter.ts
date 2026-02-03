/**
 * Log export functionality for bug reporting.
 * Packages logs, crash reports, and system info into a ZIP file.
 */

import { app, dialog, shell } from "electron";
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import path from "path";
import { createGzip } from "zlib";
import { pipeline } from "stream";
import { promisify } from "util";
import { LOGS_DIR, USER_DATA_DIR, MEMORY_DIR } from "./paths.js";
import { getCrashReports } from "./crash-reporter.js";
import { exportAnalytics } from "./feature-analytics.js";
import { logger } from "./app-logger.js";

const pipe = promisify(pipeline);

export interface ExportResult {
  ok: boolean;
  path?: string;
  error?: string;
}

export interface SystemInfo {
  appVersion: string;
  electronVersion: string;
  platform: string;
  arch: string;
  osVersion: string;
  memory: { total: number; free: number };
  uptime: number;
}

/**
 * Export logs to a single file for bug reporting.
 * Returns the path to the exported file.
 */
export async function exportLogs(): Promise<ExportResult> {
  try {
    // Show save dialog
    const result = await dialog.showSaveDialog({
      title: "导出日志",
      defaultPath: `dashixiong_logs_${formatDate(new Date())}.txt`,
      filters: [{ name: "文本文件", extensions: ["txt"] }],
    });

    if (result.canceled || !result.filePath) {
      return { ok: false, error: "cancelled" };
    }

    const exportPath = result.filePath;
    const content = await buildExportContent();

    writeFileSync(exportPath, content, "utf-8");
    logger.info(`[export] Logs exported to: ${exportPath}`);

    return { ok: true, path: exportPath };
  } catch (err: any) {
    logger.error(`[export] Failed to export logs: ${err.message}`);
    return { ok: false, error: err.message };
  }
}

/**
 * Export logs and open the file location.
 */
export async function exportLogsAndReveal(): Promise<ExportResult> {
  const result = await exportLogs();
  if (result.ok && result.path) {
    shell.showItemInFolder(result.path);
  }
  return result;
}

async function buildExportContent(): Promise<string> {
  const sections: string[] = [];

  // Section 1: System Info
  sections.push("========== 系统信息 ==========");
  sections.push(formatSystemInfo(getSystemInfo()));
  sections.push("");

  // Section 2: Crash Reports
  const crashes = getCrashReports();
  sections.push("========== 崩溃记录 ==========");
  if (crashes.length === 0) {
    sections.push("无崩溃记录");
  } else {
    for (const crash of crashes.slice(-10)) {
      sections.push(`[${crash.timestamp}] ${crash.type}`);
      sections.push(`  消息: ${crash.message}`);
      if (crash.stack) {
        sections.push(`  堆栈: ${crash.stack.split("\n").slice(0, 5).join("\n        ")}`);
      }
      sections.push("");
    }
  }
  sections.push("");

  // Section 3: Recent App Logs
  sections.push("========== 应用日志 (最近) ==========");
  const appLogs = getRecentAppLogs();
  sections.push(appLogs || "无日志文件");
  sections.push("");

  // Section 4: Usage Stats
  sections.push("========== 使用统计 ==========");
  const analytics = exportAnalytics();
  if (analytics) {
    sections.push(`用户: ${analytics.userId}`);
    sections.push(`开始日期: ${analytics.startDate}`);
    sections.push(`事件数: ${analytics.events.length}`);

    // Feature breakdown
    const byFeature = new Map<string, number>();
    for (const e of analytics.events) {
      byFeature.set(e.feature, (byFeature.get(e.feature) || 0) + 1);
    }
    sections.push("功能使用:");
    for (const [feature, count] of byFeature) {
      sections.push(`  ${feature}: ${count}次`);
    }
  } else {
    sections.push("无统计数据");
  }
  sections.push("");

  // Section 5: Config (sanitized)
  sections.push("========== 配置信息 ==========");
  sections.push(getSanitizedConfig());
  sections.push("");

  sections.push("========== 导出完成 ==========");
  sections.push(`导出时间: ${new Date().toISOString()}`);

  return sections.join("\n");
}

function getSystemInfo(): SystemInfo {
  return {
    appVersion: app.getVersion(),
    electronVersion: process.versions.electron,
    platform: process.platform,
    arch: process.arch,
    osVersion: require("os").release(),
    memory: {
      total: require("os").totalmem(),
      free: require("os").freemem(),
    },
    uptime: process.uptime(),
  };
}

function formatSystemInfo(info: SystemInfo): string {
  const memTotal = (info.memory.total / 1024 / 1024 / 1024).toFixed(1);
  const memFree = (info.memory.free / 1024 / 1024 / 1024).toFixed(1);
  return [
    `应用版本: ${info.appVersion}`,
    `Electron: ${info.electronVersion}`,
    `平台: ${info.platform} (${info.arch})`,
    `系统版本: ${info.osVersion}`,
    `内存: ${memFree}GB / ${memTotal}GB`,
    `运行时间: ${Math.floor(info.uptime / 60)}分钟`,
  ].join("\n");
}

function getRecentAppLogs(): string {
  try {
    // Find the most recent log file
    const logFiles = readdirSync(LOGS_DIR)
      .filter((f) => f.startsWith("app_") && f.endsWith(".log"))
      .map((f) => ({
        name: f,
        path: path.join(LOGS_DIR, f),
        mtime: statSync(path.join(LOGS_DIR, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (logFiles.length === 0) return "";

    const latestLog = logFiles[0];
    const content = readFileSync(latestLog.path, "utf-8");

    // Return last 500 lines
    const lines = content.split("\n");
    const lastLines = lines.slice(-500);
    return lastLines.join("\n");
  } catch {
    return "";
  }
}

function getSanitizedConfig(): string {
  try {
    const memoryPath = path.join(MEMORY_DIR, "MEMORY.md");
    if (!existsSync(memoryPath)) return "无用户配置";

    const content = readFileSync(memoryPath, "utf-8");
    // Only show structure, not personal data
    const lines = content.split("\n");
    const sanitized = lines.map((line) => {
      if (line.match(/^-\s*.+?：/)) {
        const key = line.match(/^-\s*(.+?)：/)?.[1] || "";
        return `- ${key}：[已隐藏]`;
      }
      return line;
    });
    return sanitized.join("\n");
  } catch {
    return "无法读取配置";
  }
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}
