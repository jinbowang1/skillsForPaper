import { readFileSync, existsSync } from "fs";
import {
  SKILLS_DIR,
  MEMORY_PATH,
  SOUL_PATH,
  OUTPUT_DIR,
  LOGS_DIR,
} from "./paths.js";

export { OUTPUT_DIR, MEMORY_PATH, LOGS_DIR };

/** Load skill directories — always includes the bundled SKILLS_DIR */
export function loadSkillPaths(): string[] {
  const dirs: string[] = [];
  if (existsSync(SKILLS_DIR)) {
    dirs.push(SKILLS_DIR);
  }
  return dirs;
}

/** Read MEMORY.md content, or return empty string if not found */
export function loadMemory(): string {
  if (!existsSync(MEMORY_PATH)) return "";
  return readFileSync(MEMORY_PATH, "utf-8");
}

/** Read SOUL.md content, or return empty string if not found */
export function loadSoul(): string {
  if (!existsSync(SOUL_PATH)) return "";
  return readFileSync(SOUL_PATH, "utf-8");
}
