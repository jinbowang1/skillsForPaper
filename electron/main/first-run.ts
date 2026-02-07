import { existsSync, mkdirSync, copyFileSync, readdirSync } from "fs";
import path from "path";
import {
  IS_PACKAGED,
  ENV_PATH,
  BUNDLED_ENV_PATH,
  MEMORY_DIR,
  LOGS_DIR,
  EXTENSIONS_DIR,
  BUNDLED_EXTENSIONS_DIR,
  RESOURCES_DIR,
} from "./paths.js";
import { getOutputDir } from "./settings.js";

/** True when packaged AND the user has not yet created a .env file */
export function isFirstRun(): boolean {
  return IS_PACKAGED && !existsSync(ENV_PATH);
}

/**
 * Ensure all writable directories and template files exist in userData.
 * Idempotent — only copies files that do not already exist.
 */
export function bootstrapUserData(): void {
  // Create writable directories
  for (const dir of [MEMORY_DIR, getOutputDir(), LOGS_DIR, EXTENSIONS_DIR]) {
    mkdirSync(dir, { recursive: true });
  }

  // Copy bundled .env (pre-set API keys) if user hasn't created one yet
  if (!existsSync(ENV_PATH) && existsSync(BUNDLED_ENV_PATH)) {
    copyFileSync(BUNDLED_ENV_PATH, ENV_PATH);
  }

  // Copy bundled memory templates (MEMORY.md, SOUL.md) if not present
  const bundledMemoryDir = path.join(RESOURCES_DIR, "memory");
  if (existsSync(bundledMemoryDir)) {
    for (const file of ["MEMORY.md", "SOUL.md"]) {
      const src = path.join(bundledMemoryDir, file);
      const dest = path.join(MEMORY_DIR, file);
      if (existsSync(src) && !existsSync(dest)) {
        copyFileSync(src, dest);
      }
    }
  }

  // Copy bundled extensions if not present
  if (existsSync(BUNDLED_EXTENSIONS_DIR)) {
    try {
      const files = readdirSync(BUNDLED_EXTENSIONS_DIR);
      for (const file of files) {
        const src = path.join(BUNDLED_EXTENSIONS_DIR, file);
        const dest = path.join(EXTENSIONS_DIR, file);
        if (!existsSync(dest)) {
          copyFileSync(src, dest);
        }
      }
    } catch {
      // Non-critical — extensions are optional
    }
  }
}
