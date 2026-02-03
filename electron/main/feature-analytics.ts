/**
 * Feature usage analytics tracking.
 * Tracks which features users actually use to inform product decisions.
 * All data is local-only unless explicitly exported.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { LOGS_DIR } from "./paths.js";
import { logger } from "./app-logger.js";

const ANALYTICS_DIR = path.join(LOGS_DIR, "analytics");
const ANALYTICS_FILE = path.join(ANALYTICS_DIR, "features.json");

export interface FeatureEvent {
  feature: string;
  action: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface FeatureStats {
  feature: string;
  count: number;
  lastUsed: number;
}

export interface AnalyticsData {
  userId: string;
  startDate: string;
  events: FeatureEvent[];
}

let analyticsData: AnalyticsData | null = null;

export function initFeatureAnalytics(userId: string = "unknown") {
  mkdirSync(ANALYTICS_DIR, { recursive: true });
  analyticsData = loadOrCreate(userId);
  logger.info("[analytics] Feature analytics initialized");
}

/**
 * Track a feature usage event.
 *
 * Examples:
 *   trackFeature("chat", "send_message")
 *   trackFeature("voice", "start_recording")
 *   trackFeature("model", "switch", { from: "Claude", to: "MiniMax" })
 *   trackFeature("bookshelf", "open_file", { ext: ".pdf" })
 */
export function trackFeature(feature: string, action: string, metadata?: Record<string, any>) {
  if (!analyticsData) return;

  const event: FeatureEvent = {
    feature,
    action,
    timestamp: Date.now(),
    metadata,
  };

  analyticsData.events.push(event);

  // Keep only last 30 days of events
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  analyticsData.events = analyticsData.events.filter((e) => e.timestamp > cutoff);

  save();

  logger.debug(`[analytics] ${feature}:${action}`);
}

/** Get aggregated feature usage stats */
export function getFeatureStats(): FeatureStats[] {
  if (!analyticsData) return [];

  const stats = new Map<string, { count: number; lastUsed: number }>();

  for (const event of analyticsData.events) {
    const key = `${event.feature}:${event.action}`;
    const existing = stats.get(key) || { count: 0, lastUsed: 0 };
    existing.count += 1;
    existing.lastUsed = Math.max(existing.lastUsed, event.timestamp);
    stats.set(key, existing);
  }

  return Array.from(stats, ([feature, s]) => ({
    feature,
    count: s.count,
    lastUsed: s.lastUsed,
  })).sort((a, b) => b.count - a.count);
}

/** Get summary for display in UI */
export function getAnalyticsSummary(): {
  totalEvents: number;
  startDate: string;
  topFeatures: Array<{ name: string; count: number }>;
  recentActivity: Array<{ feature: string; action: string; time: string }>;
} {
  if (!analyticsData) {
    return {
      totalEvents: 0,
      startDate: new Date().toISOString().slice(0, 10),
      topFeatures: [],
      recentActivity: [],
    };
  }

  // Aggregate by feature (without action)
  const byFeature = new Map<string, number>();
  for (const event of analyticsData.events) {
    byFeature.set(event.feature, (byFeature.get(event.feature) || 0) + 1);
  }

  const topFeatures = Array.from(byFeature, ([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Recent activity (last 10 events)
  const recentActivity = analyticsData.events
    .slice(-10)
    .reverse()
    .map((e) => ({
      feature: e.feature,
      action: e.action,
      time: formatRelativeTime(e.timestamp),
    }));

  return {
    totalEvents: analyticsData.events.length,
    startDate: analyticsData.startDate,
    topFeatures,
    recentActivity,
  };
}

/** Export all analytics data */
export function exportAnalytics(): AnalyticsData | null {
  return analyticsData;
}

function loadOrCreate(userId: string): AnalyticsData {
  if (existsSync(ANALYTICS_FILE)) {
    try {
      const data = JSON.parse(readFileSync(ANALYTICS_FILE, "utf-8"));
      // Update userId if it changed
      data.userId = userId;
      return data;
    } catch {}
  }
  return {
    userId,
    startDate: new Date().toISOString().slice(0, 10),
    events: [],
  };
}

function save() {
  if (!analyticsData) return;
  try {
    writeFileSync(ANALYTICS_FILE, JSON.stringify(analyticsData, null, 2), "utf-8");
  } catch (err) {
    logger.error("[analytics] Failed to save:", err);
  }
}

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  return `${days}天前`;
}
