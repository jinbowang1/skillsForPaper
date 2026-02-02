import { app } from "electron";
import path from "path";

export const IS_PACKAGED = app.isPackaged;
const DEV_ROOT = path.resolve(__dirname, "../../..");

export const RESOURCES_DIR = IS_PACKAGED ? process.resourcesPath : DEV_ROOT;
export const USER_DATA_DIR = IS_PACKAGED ? app.getPath("userData") : DEV_ROOT;

export const AGENT_CWD = USER_DATA_DIR;
export const SKILLS_DIR = path.join(RESOURCES_DIR, "skills");
export const MEMORY_DIR = path.join(USER_DATA_DIR, "memory");
export const MEMORY_PATH = path.join(MEMORY_DIR, "MEMORY.md");
export const SOUL_PATH = path.join(MEMORY_DIR, "SOUL.md");
export const OUTPUT_DIR = path.join(USER_DATA_DIR, "output");
export const LOGS_DIR = path.join(USER_DATA_DIR, "logs");
export const ENV_PATH = IS_PACKAGED
  ? path.join(USER_DATA_DIR, ".env")
  : path.join(DEV_ROOT, ".env");
export const EXTENSIONS_DIR = path.join(USER_DATA_DIR, ".pi", "extensions");
export const BUNDLED_EXTENSIONS_DIR = path.join(RESOURCES_DIR, "extensions");
