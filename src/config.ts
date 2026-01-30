import { readFileSync, existsSync } from "fs";
import path from "path";
import dotenv from "dotenv";

const PROJECT_ROOT = path.resolve(
  import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname),
  ".."
);

// Load .env from project root (not cwd), so `paper` command works from any directory
dotenv.config({ path: path.join(PROJECT_ROOT, ".env") });

export interface SkillPathsConfig {
  skillDirs: string[];
}

/** Load and resolve skill directories from skill-paths.json */
export function loadSkillPaths(): string[] {
  const configPath = path.join(PROJECT_ROOT, "skill-paths.json");
  if (!existsSync(configPath)) return [];

  const raw = readFileSync(configPath, "utf-8");
  const config: SkillPathsConfig = JSON.parse(raw);

  return config.skillDirs
    .map((dir) => path.resolve(PROJECT_ROOT, dir))
    .filter((dir) => {
      if (!existsSync(dir)) {
        console.warn(`[config] skill directory not found, skipping: ${dir}`);
        return false;
      }
      return true;
    });
}

/** Read MEMORY.md content, or return empty string if not found */
export function loadMemory(): string {
  const memoryPath = path.join(PROJECT_ROOT, "memory", "MEMORY.md");
  if (!existsSync(memoryPath)) return "";
  return readFileSync(memoryPath, "utf-8");
}

/** Read SOUL.md content, or return empty string if not found */
export function loadSoul(): string {
  const soulPath = path.join(PROJECT_ROOT, "memory", "SOUL.md");
  if (!existsSync(soulPath)) return "";
  return readFileSync(soulPath, "utf-8");
}

/** Path to MEMORY.md */
export const MEMORY_PATH = path.join(PROJECT_ROOT, "memory", "MEMORY.md");

/** Project-level output directory */
export const OUTPUT_DIR = path.join(PROJECT_ROOT, "output");

/** Project-level logs directory */
export const LOGS_DIR = path.join(PROJECT_ROOT, "logs");

/** Project root */
export const ROOT_DIR = PROJECT_ROOT;
