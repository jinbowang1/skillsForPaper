/**
 * User settings persistence.
 * Stores user preferences like custom output directory.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import { app } from "electron";

const IS_PACKAGED = app.isPackaged;
const DEV_ROOT = path.resolve(__dirname, "../../..");
const USER_DATA_DIR = IS_PACKAGED ? app.getPath("userData") : DEV_ROOT;
const SETTINGS_FILE = path.join(USER_DATA_DIR, "settings.json");

// Default output directory (user's Documents folder)
const DEFAULT_OUTPUT_DIR = path.join(app.getPath("documents"), "大师兄");

interface UserSettings {
  outputDir?: string;
}

let cachedSettings: UserSettings | null = null;

/**
 * Load settings from disk.
 */
function loadSettings(): UserSettings {
  if (cachedSettings) return cachedSettings;

  try {
    if (existsSync(SETTINGS_FILE)) {
      const raw = readFileSync(SETTINGS_FILE, "utf-8");
      cachedSettings = JSON.parse(raw);
      return cachedSettings!;
    }
  } catch {
    // Ignore parse errors, return defaults
  }

  cachedSettings = {};
  return cachedSettings;
}

/**
 * Save settings to disk.
 */
function saveSettings(settings: UserSettings): void {
  try {
    const dir = path.dirname(SETTINGS_FILE);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
    cachedSettings = settings;
  } catch (err) {
    console.error("[settings] Failed to save:", err);
  }
}

/**
 * Get the output directory (custom or default).
 */
export function getOutputDir(): string {
  const settings = loadSettings();
  const dir = settings.outputDir || DEFAULT_OUTPUT_DIR;

  // Ensure directory exists
  if (!existsSync(dir)) {
    try {
      mkdirSync(dir, { recursive: true });
    } catch {
      // Fall back to default if custom path is invalid
      return DEFAULT_OUTPUT_DIR;
    }
  }

  return dir;
}

/**
 * Get the default output directory.
 */
export function getDefaultOutputDir(): string {
  return DEFAULT_OUTPUT_DIR;
}

/**
 * Set a custom output directory.
 */
export function setOutputDir(dir: string): void {
  const settings = loadSettings();

  // If same as default, remove custom setting
  if (dir === DEFAULT_OUTPUT_DIR) {
    delete settings.outputDir;
  } else {
    settings.outputDir = dir;
  }

  saveSettings(settings);
}

/**
 * Reset output directory to default.
 */
export function resetOutputDir(): void {
  const settings = loadSettings();
  delete settings.outputDir;
  saveSettings(settings);
}
