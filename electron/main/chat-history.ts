/**
 * Chat history persistence module.
 *
 * Stores chat messages to JSON file with support for large images as external files.
 * Uses debounced saves to avoid excessive disk I/O.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, readdirSync } from "fs";
import path from "path";
import crypto from "crypto";
import { LOGS_DIR } from "./paths.js";
import { logger } from "./app-logger.js";

// ── Types ──

interface ContentBlock {
  type: string;
  text?: string;
  imageData?: string;
  imageMimeType?: string;
  imageRef?: string;  // Reference to external image file
  language?: string;
  filename?: string;
  code?: string;
  filePath?: string;
  fileSize?: number;
  citations?: any[];
  toolCallId?: string;
  question?: string;
  options?: any[];
  selectedIndex?: number;
  answered?: boolean;
  customAnswer?: string;
  toolName?: string;
  toolStatus?: string;
  toolArgs?: Record<string, any>;
  toolResult?: string;
  isError?: boolean;
  metrics?: any;
  steps?: any[];
  taskTitle?: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  blocks: ContentBlock[];
  timestamp: number;
  isStreaming?: boolean;
}

interface ChatHistoryData {
  version: number;
  model: string;
  messages: ChatMessage[];
  savedAt: number;
}

// ── Constants ──

const CHAT_HISTORY_DIR = LOGS_DIR;
const CHAT_HISTORY_FILE = path.join(CHAT_HISTORY_DIR, "chat-history.json");
const CHAT_IMAGES_DIR = path.join(CHAT_HISTORY_DIR, "chat-images");
const MAX_MESSAGES = 200;
const IMAGE_SIZE_THRESHOLD = 50 * 1024; // 50KB
const DEBOUNCE_MS = 500;
const CURRENT_VERSION = 1;

// ── State ──

let saveTimeout: ReturnType<typeof setTimeout> | null = null;
let pendingData: { messages: ChatMessage[]; model: string } | null = null;

// ── Public API ──

/**
 * Initialize chat history module.
 * Creates necessary directories.
 */
export function initChatHistory(): void {
  try {
    mkdirSync(CHAT_HISTORY_DIR, { recursive: true });
    mkdirSync(CHAT_IMAGES_DIR, { recursive: true });
    logger.info("[chat-history] Initialized");
  } catch (err) {
    logger.error("[chat-history] Failed to initialize:", err);
  }
}

/**
 * Save chat history with debouncing.
 * Large images (>50KB) are stored as external files.
 */
export function saveChatHistory(messages: ChatMessage[], model: string): void {
  pendingData = { messages, model };

  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(() => {
    if (pendingData) {
      doSave(pendingData.messages, pendingData.model);
      pendingData = null;
    }
    saveTimeout = null;
  }, DEBOUNCE_MS);
}

/**
 * Load chat history from disk.
 * Returns empty array if file doesn't exist or is corrupted.
 */
export function loadChatHistory(): { messages: ChatMessage[]; model: string } | null {
  try {
    if (!existsSync(CHAT_HISTORY_FILE)) {
      logger.info("[chat-history] No history file found");
      return null;
    }

    const raw = readFileSync(CHAT_HISTORY_FILE, "utf-8");
    const data: ChatHistoryData = JSON.parse(raw);

    // Restore image references to inline data
    const messages = data.messages.map((msg) => ({
      ...msg,
      blocks: msg.blocks.map((block) => restoreImageBlock(block)),
    }));

    // Fix interrupted tool states
    const fixedMessages = messages.map((msg) => ({
      ...msg,
      blocks: msg.blocks.map((block) => {
        if (block.type === "tool" && block.toolStatus === "running") {
          return { ...block, toolStatus: "error", isError: true };
        }
        return block;
      }),
    }));

    logger.info(`[chat-history] Loaded ${fixedMessages.length} messages`);
    return { messages: fixedMessages, model: data.model || "" };
  } catch (err) {
    logger.error("[chat-history] Failed to load:", err);
    return null;
  }
}

/**
 * Flush pending saves immediately.
 * Call this on app quit.
 */
export function flushChatHistory(): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }

  if (pendingData) {
    doSave(pendingData.messages, pendingData.model);
    pendingData = null;
    logger.info("[chat-history] Flushed on quit");
  }
}

/**
 * Clear chat history.
 * Deletes the history file and associated images.
 */
export function clearChatHistory(): void {
  try {
    // Cancel pending saves
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      saveTimeout = null;
    }
    pendingData = null;

    // Delete history file
    if (existsSync(CHAT_HISTORY_FILE)) {
      unlinkSync(CHAT_HISTORY_FILE);
    }

    // Delete all images
    if (existsSync(CHAT_IMAGES_DIR)) {
      const files = readdirSync(CHAT_IMAGES_DIR);
      for (const file of files) {
        try {
          unlinkSync(path.join(CHAT_IMAGES_DIR, file));
        } catch {
          // Ignore individual file errors
        }
      }
    }

    logger.info("[chat-history] Cleared");
  } catch (err) {
    logger.error("[chat-history] Failed to clear:", err);
  }
}

// ── Internal ──

function doSave(messages: ChatMessage[], model: string): void {
  try {
    // Limit message count
    const trimmed = messages.slice(-MAX_MESSAGES);

    // Extract large images to external files
    const processed = trimmed.map((msg) => ({
      ...msg,
      // Don't save streaming state
      isStreaming: undefined,
      blocks: msg.blocks.map((block) => processImageBlock(block)),
    }));

    const data: ChatHistoryData = {
      version: CURRENT_VERSION,
      model,
      messages: processed,
      savedAt: Date.now(),
    };

    writeFileSync(CHAT_HISTORY_FILE, JSON.stringify(data, null, 2), "utf-8");
    logger.debug(`[chat-history] Saved ${trimmed.length} messages`);
  } catch (err) {
    logger.error("[chat-history] Failed to save:", err);
  }
}

/**
 * Process image block: if image is large, save to external file and replace with reference.
 */
function processImageBlock(block: ContentBlock): ContentBlock {
  if (block.type !== "image" || !block.imageData) {
    return block;
  }

  // Check image size (base64 is ~33% larger than binary)
  const estimatedSize = (block.imageData.length * 3) / 4;

  if (estimatedSize <= IMAGE_SIZE_THRESHOLD) {
    return block;
  }

  // Save to external file
  try {
    const hash = crypto.createHash("md5").update(block.imageData).digest("hex");
    const ext = getExtFromMime(block.imageMimeType || "image/png");
    const filename = `${hash}.${ext}`;
    const filepath = path.join(CHAT_IMAGES_DIR, filename);

    if (!existsSync(filepath)) {
      const buffer = Buffer.from(block.imageData, "base64");
      writeFileSync(filepath, buffer);
      logger.debug(`[chat-history] Saved large image: ${filename}`);
    }

    return {
      ...block,
      imageData: undefined,
      imageRef: filename,
    };
  } catch (err) {
    logger.error("[chat-history] Failed to save image:", err);
    return block;
  }
}

/**
 * Restore image block: if image is external, load it back inline.
 */
function restoreImageBlock(block: ContentBlock): ContentBlock {
  if (block.type !== "image" || !block.imageRef) {
    return block;
  }

  try {
    const filepath = path.join(CHAT_IMAGES_DIR, block.imageRef);
    if (existsSync(filepath)) {
      const buffer = readFileSync(filepath);
      const ext = path.extname(block.imageRef).slice(1);
      return {
        ...block,
        imageData: buffer.toString("base64"),
        imageMimeType: getMimeFromExt(ext),
        imageRef: undefined,
      };
    }
  } catch (err) {
    logger.error("[chat-history] Failed to restore image:", err);
  }

  return block;
}

function getExtFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
  };
  return map[mime] || "png";
}

function getMimeFromExt(ext: string): string {
  const map: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
  };
  return map[ext] || "image/png";
}
