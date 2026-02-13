/**
 * API Key 安全管理器
 *
 * 职责：
 * 1. 登录后从服务端获取 API key
 * 2. 使用 Electron safeStorage 加密缓存到本地（利用 OS 钥匙串）
 * 3. 离线时从加密缓存加载
 * 4. 注入 process.env 供 session-bridge 使用
 * 5. 登出时清除缓存
 */

import { safeStorage, app } from "electron";
import * as fs from "fs";
import * as path from "path";
import { logger } from "./app-logger.js";

const KEYS_FILE = path.join(app.getPath("userData"), "keys.enc");

export interface ApiKeys {
  ANTHROPIC_API_KEY?: string;
  MINIMAX_API_KEY?: string;
  DASHSCOPE_API_KEY?: string;
  MOONSHOT_API_KEY?: string;
}

const KEY_NAMES: (keyof ApiKeys)[] = [
  "ANTHROPIC_API_KEY",
  "MINIMAX_API_KEY",
  "DASHSCOPE_API_KEY",
  "MOONSHOT_API_KEY",
];

/**
 * 将 API keys 注入 process.env
 */
export function injectKeys(keys: ApiKeys): void {
  for (const [key, value] of Object.entries(keys)) {
    if (value) {
      process.env[key] = value;
    }
  }
  logger.info("[key-manager] Keys injected into process.env");
}

/**
 * 使用 safeStorage 加密并缓存 keys 到磁盘
 */
export function cacheKeys(keys: ApiKeys): void {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      logger.warn("[key-manager] safeStorage encryption not available, skipping cache");
      return;
    }
    const encrypted = safeStorage.encryptString(JSON.stringify(keys));
    fs.writeFileSync(KEYS_FILE, encrypted);
    logger.info("[key-manager] Keys cached (encrypted)");
  } catch (err) {
    logger.error("[key-manager] Failed to cache keys:", err);
  }
}

/**
 * 从加密缓存加载 keys
 */
export function loadCachedKeys(): ApiKeys | null {
  try {
    if (!fs.existsSync(KEYS_FILE)) return null;
    if (!safeStorage.isEncryptionAvailable()) {
      logger.warn("[key-manager] safeStorage encryption not available, cannot load cache");
      return null;
    }
    const encrypted = fs.readFileSync(KEYS_FILE);
    const decrypted = safeStorage.decryptString(encrypted);
    const keys = JSON.parse(decrypted) as ApiKeys;
    logger.info("[key-manager] Keys loaded from encrypted cache");
    return keys;
  } catch (err) {
    logger.error("[key-manager] Failed to load cached keys:", err);
    return null;
  }
}

/**
 * 清除缓存的 keys 和 process.env 中的 key 值
 */
export function clearKeys(): void {
  try {
    if (fs.existsSync(KEYS_FILE)) {
      fs.unlinkSync(KEYS_FILE);
    }
  } catch (err) {
    logger.error("[key-manager] Failed to delete keys file:", err);
  }

  for (const key of KEY_NAMES) {
    delete process.env[key];
  }
  logger.info("[key-manager] Keys cleared");
}

/**
 * 检查是否有缓存的 keys
 */
export function hasCachedKeys(): boolean {
  return fs.existsSync(KEYS_FILE);
}
