import { execFile } from "child_process";
import { ROOT_DIR } from "./config.js";
import { logger } from "./logger.js";

const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

function exec(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { cwd: ROOT_DIR }, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout);
    });
  });
}

let running = false;

async function snapshot(): Promise<void> {
  if (running) return; // skip if previous snapshot still in progress
  running = true;
  try {
    const status = await exec("git", ["status", "--porcelain"]);
    if (!status.trim()) return; // nothing to commit

    await exec("git", ["add", "-A"]);
    const ts = new Date().toISOString().slice(0, 19).replace("T", " ");
    await exec("git", ["commit", "-m", `auto-snapshot: ${ts}`]);
    logger.info(`[auto-snapshot] committed at ${ts}`);
  } catch {
    // git not initialized, nothing to commit, or other issue — silently skip
  } finally {
    running = false;
  }
}

export function startAutoSnapshot(): void {
  snapshot();
  const timer = setInterval(snapshot, INTERVAL_MS);
  timer.unref(); // don't prevent process exit
}
