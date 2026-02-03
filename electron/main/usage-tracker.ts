/**
 * Per-user usage tracking with enterprise WeChat webhook reporting.
 *
 * Flow:
 *  1. session-bridge calls trackEvent() on every session event
 *  2. On message_end with assistant role, we extract token usage + cost
 *  3. Usage is accumulated per day in a local JSON file
 *  4. A daily summary is sent to the configured WeChat webhook
 *  5. On app quit, any unsent data is flushed
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import https from "https";
import { LOGS_DIR, MEMORY_DIR } from "./paths.js";
import { logger } from "./app-logger.js";

// ── Types ──

interface UsageRecord {
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  cost: number;
  timestamp: number;
}

interface DailyUsage {
  date: string;
  userId: string;
  records: UsageRecord[];
  reported: boolean;
}

// ── State ──

const USAGE_DIR = path.join(LOGS_DIR, "usage");
let currentDay = "";
let dailyUsage: DailyUsage | null = null;
let reportTimer: ReturnType<typeof setInterval> | null = null;

// ── Daily Limits (for reference, not blocking) ──
const DAILY_LIMIT_CNY = Number(process.env.DAILY_LIMIT_CNY) || 100;
const WARNING_THRESHOLD = 0.8;

// ── Public API ──

export function initUsageTracker() {
  mkdirSync(USAGE_DIR, { recursive: true });
  currentDay = todayStr();
  dailyUsage = loadOrCreate(currentDay);

  // Send any unreported previous-day data
  sendPreviousDayIfNeeded();

  // Check every hour if we crossed midnight → send yesterday's summary
  reportTimer = setInterval(() => {
    const today = todayStr();
    if (today !== currentDay) {
      // Day changed — flush yesterday and start new day
      flush();
      currentDay = today;
      dailyUsage = loadOrCreate(today);
    }
  }, 60 * 60 * 1000);
}

/** Call this from session-bridge's handleSessionEvent */
export function trackEvent(event: any) {
  if (event.type !== "message_end") return;

  const msg = event.message;
  if (!msg || msg.role !== "assistant") return;

  const usage = msg.usage;
  if (!usage) return;

  const today = todayStr();

  // Day rolled over mid-session
  if (today !== currentDay) {
    flush();
    currentDay = today;
    dailyUsage = loadOrCreate(today);
  }

  if (!dailyUsage) dailyUsage = loadOrCreate(today);

  // Ensure userId is populated
  if (!dailyUsage.userId) {
    dailyUsage.userId = getUserId();
  }

  const record: UsageRecord = {
    model: msg.model || "unknown",
    provider: msg.provider || msg.api || "unknown",
    inputTokens: usage.input || 0,
    outputTokens: usage.output || 0,
    cacheReadTokens: usage.cacheRead || 0,
    cacheWriteTokens: usage.cacheWrite || 0,
    cost: usage.cost?.total || 0,
    timestamp: Date.now(),
  };

  dailyUsage.records.push(record);
  save(dailyUsage);

  // Check if user hit a new milestone (every 100 CNY)
  checkAndNotifyMilestone();

  logger.info(
    `[usage] ${record.provider}/${record.model} in=${record.inputTokens} out=${record.outputTokens} cost=$${record.cost.toFixed(4)}`
  );
}

/** Flush and report current day's data. Call on app quit. */
export function flush() {
  if (!dailyUsage || dailyUsage.records.length === 0) return;
  if (dailyUsage.reported) return;

  save(dailyUsage);
  sendReport(dailyUsage);
}

export function stopUsageTracker() {
  if (reportTimer) clearInterval(reportTimer);
  flush();
}

// ── Persistence ──

function filePath(date: string): string {
  return path.join(USAGE_DIR, `${date}.json`);
}

function loadOrCreate(date: string): DailyUsage {
  const fp = filePath(date);
  if (existsSync(fp)) {
    try {
      return JSON.parse(readFileSync(fp, "utf-8"));
    } catch {
      // Corrupted file, start fresh
    }
  }
  return { date, userId: getUserId(), records: [], reported: false };
}

function save(data: DailyUsage) {
  try {
    writeFileSync(filePath(data.date), JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    logger.error("[usage] Failed to save:", err);
  }
}

// ── User identification ──

function getUserId(): string {
  try {
    const memPath = path.join(MEMORY_DIR, "MEMORY.md");
    if (!existsSync(memPath)) return "unknown";

    const content = readFileSync(memPath, "utf-8");
    let name = "";
    let institution = "";

    for (const line of content.split("\n")) {
      const m = line.match(/^-\s*(.+?)：(.+)$/);
      if (m) {
        if (m[1].trim() === "姓名") name = m[2].trim();
        if (m[1].trim() === "单位") institution = m[2].trim();
      }
    }

    if (name && institution) return `${name}（${institution}）`;
    if (name) return name;
    return "unknown";
  } catch {
    return "unknown";
  }
}

// ── Reporting ──

function sendPreviousDayIfNeeded() {
  const yesterday = dayStr(-1);
  const fp = filePath(yesterday);
  if (!existsSync(fp)) return;

  try {
    const data: DailyUsage = JSON.parse(readFileSync(fp, "utf-8"));
    if (!data.reported && data.records.length > 0) {
      sendReport(data);
    }
  } catch {}
}

function sendReport(data: DailyUsage) {
  const webhookUrl = process.env.USAGE_WEBHOOK_URL;
  if (!webhookUrl) {
    logger.info("[usage] No USAGE_WEBHOOK_URL configured, skipping report");
    return;
  }

  const markdown = buildMarkdown(data);

  const body = JSON.stringify({
    msgtype: "markdown",
    markdown: { content: markdown },
  });

  try {
    const url = new URL(webhookUrl);
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let resData = "";
        res.on("data", (chunk) => (resData += chunk));
        res.on("end", () => {
          logger.info(`[usage] Webhook response: ${res.statusCode} ${resData.slice(0, 200)}`);
          if (res.statusCode === 200) {
            data.reported = true;
            save(data);
          }
        });
      }
    );

    req.on("error", (err) => {
      logger.error("[usage] Webhook error:", err);
    });

    req.setTimeout(10000, () => {
      req.destroy();
      logger.error("[usage] Webhook timeout");
    });

    req.write(body);
    req.end();
  } catch (err) {
    logger.error("[usage] Failed to send webhook:", err);
  }
}

// SDK calculates cost in USD; convert to CNY for Chinese users
const USD_TO_CNY = 7.25;

/** Get current day's usage stats (for renderer display + on-demand report) */
export function getUsageStats(): { date: string; userId: string; models: Array<{ name: string; count: number; tokens: number; cny: number }>; totalCount: number; totalTokens: number; totalCny: number } | null {
  if (!dailyUsage || dailyUsage.records.length === 0) return null;

  const byModel = new Map<string, { tokens: number; cost: number; count: number }>();
  for (const r of dailyUsage.records) {
    const e = byModel.get(r.model) || { tokens: 0, cost: 0, count: 0 };
    e.tokens += r.inputTokens + r.outputTokens;
    e.cost += r.cost;
    e.count += 1;
    byModel.set(r.model, e);
  }

  const models = Array.from(byModel, ([name, s]) => ({
    name, count: s.count, tokens: s.tokens, cny: +(s.cost * USD_TO_CNY).toFixed(2),
  }));
  const totalCost = dailyUsage.records.reduce((s, r) => s + r.cost, 0);
  const totalTokens = dailyUsage.records.reduce((s, r) => s + r.inputTokens + r.outputTokens, 0);

  return {
    date: dailyUsage.date,
    userId: dailyUsage.userId,
    models,
    totalCount: dailyUsage.records.length,
    totalTokens,
    totalCny: +(totalCost * USD_TO_CNY).toFixed(2),
  };
}

/** Send current day's report immediately (on-demand) */
export function sendReportNow() {
  if (dailyUsage && dailyUsage.records.length > 0) {
    sendReport(dailyUsage);
  }
}

// ── Milestone Notifications ──

let lastNotifiedMilestone = 0;

/** Send milestone notification to WeChat webhook */
function checkAndNotifyMilestone() {
  if (!dailyUsage) return;

  const totalCny = dailyUsage.records.reduce((sum, r) => sum + r.cost, 0) * USD_TO_CNY;
  const currentMilestone = Math.floor(totalCny / 100) * 100;

  if (currentMilestone > 0 && currentMilestone > lastNotifiedMilestone) {
    lastNotifiedMilestone = currentMilestone;
    sendMilestoneNotification(dailyUsage.userId, currentMilestone, totalCny);
  }
}

function sendMilestoneNotification(userId: string, milestone: number, totalCny: number) {
  const webhookUrl = process.env.USAGE_WEBHOOK_URL;
  if (!webhookUrl) return;

  const emoji = milestone >= 500 ? "🔥" : milestone >= 300 ? "🚀" : milestone >= 200 ? "⭐" : "🎉";
  const markdown = `${emoji} <font color="info">${userId}</font> 突破 <font color="warning">¥${milestone}</font> 里程碑！（当前 ¥${totalCny.toFixed(2)}）`;

  const body = JSON.stringify({
    msgtype: "markdown",
    markdown: { content: markdown },
  });

  try {
    const url = new URL(webhookUrl);
    const req = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        logger.info(`[usage] Milestone notification sent: ${milestone} CNY, status=${res.statusCode}`);
      }
    );
    req.on("error", (err) => logger.error("[usage] Milestone webhook error:", err));
    req.setTimeout(5000, () => req.destroy());
    req.write(body);
    req.end();
  } catch (err) {
    logger.error("[usage] Failed to send milestone notification:", err);
  }
}

// ── Usage Limits ──

export interface UsageLimitStatus {
  dailyLimitCny: number;
  currentUsageCny: number;
  percentUsed: number;
  isAtLimit: boolean;
  isNearLimit: boolean;
}

/** Check if user is at or near their daily limit */
export function checkUsageLimit(): UsageLimitStatus {
  const currentCny = dailyUsage
    ? dailyUsage.records.reduce((sum, r) => sum + r.cost, 0) * USD_TO_CNY
    : 0;

  const percentUsed = (currentCny / DAILY_LIMIT_CNY) * 100;
  const isAtLimit = currentCny >= DAILY_LIMIT_CNY;
  const isNearLimit = percentUsed >= WARNING_THRESHOLD * 100;

  return {
    dailyLimitCny: DAILY_LIMIT_CNY,
    currentUsageCny: +currentCny.toFixed(2),
    percentUsed: +percentUsed.toFixed(1),
    isAtLimit,
    isNearLimit,
  };
}

function buildMarkdown(data: DailyUsage): string {
  const byModel = new Map<string, { cost: number; count: number }>();
  for (const r of data.records) {
    const e = byModel.get(r.model) || { cost: 0, count: 0 };
    e.cost += r.cost;
    e.count += 1;
    byModel.set(r.model, e);
  }

  const totalCost = data.records.reduce((s, r) => s + r.cost, 0);
  const totalCny = totalCost * USD_TO_CNY;
  const totalCount = data.records.length;

  // Short model names for compact display
  const SHORT: Record<string, string> = {
    "MiniMax-M2.1": "M2.1", "MiniMax M2.1": "M2.1",
    "claude-opus-4-5": "Claude", "Claude Opus 4.5": "Claude",
    "qwen3-max": "Qwen3", "Qwen3 Max": "Qwen3",
    "kimi-k2.5": "Kimi", "Kimi K2.5": "Kimi",
  };

  const parts: string[] = [];
  for (const [model, s] of byModel) {
    const short = SHORT[model] || model;
    const cny = s.cost * USD_TO_CNY;
    parts.push(`${short}×${s.count} ¥${cny.toFixed(2)}`);
  }

  return `${data.userId} ${data.date.slice(5)} | ${parts.join(" | ")} | <font color="warning">合计${totalCount}次 ¥${totalCny.toFixed(2)}</font>`;
}

/** Format token count: 1234 → "1.2K", 1234567 → "1.2M" */
function fmtK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function dayStr(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}
