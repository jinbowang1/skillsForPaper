import { execSync } from "child_process";
import path from "path";
import fs from "fs";

const ELECTRON_DIR = path.resolve(__dirname, "../..");
const PID_FILE = path.join(ELECTRON_DIR, ".forge-test-pid");

async function globalTeardown() {
  // Kill the forge process group we started
  if (fs.existsSync(PID_FILE)) {
    const pid = Number(fs.readFileSync(PID_FILE, "utf-8").trim());
    fs.unlinkSync(PID_FILE);
    console.log(`[global-teardown] Killing forge process group (PID ${pid})...`);
    try {
      // Kill the entire process group (negative PID)
      process.kill(-pid, "SIGTERM");
    } catch {
      // Process group might have already exited
    }
  }

  // Clean up any leftover processes on port 5173
  try {
    execSync("lsof -ti:5173 | xargs kill -9 2>/dev/null", { stdio: "ignore" });
  } catch {
    // No process on port
  }
}

export default globalTeardown;
