import { spawn, type ChildProcess } from "child_process";
import path from "path";
import http from "http";
import fs from "fs";

const ELECTRON_DIR = path.resolve(__dirname, "../..");
const VITE_PORT = 5173;
const VITE_URL = `http://localhost:${VITE_PORT}`;
const PID_FILE = path.join(ELECTRON_DIR, ".forge-test-pid");

function canFetch(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve(res.statusCode !== undefined);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(url: string, timeout = 60_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await canFetch(url)) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Dev server did not become reachable at ${url} within ${timeout}ms`);
}

async function globalSetup() {
  // If Vite dev server is already running (user ran `npm start` manually), skip
  if (await canFetch(VITE_URL)) {
    console.log(`[global-setup] ${VITE_URL} already reachable — skipping forge start.`);
    return;
  }

  console.log("[global-setup] Starting electron-forge (builds main+preload, starts Vite dev server)...");
  const forgeProc = spawn("npx", ["electron-forge", "start"], {
    cwd: ELECTRON_DIR,
    stdio: "pipe",
    env: { ...process.env },
    detached: true,
  });

  forgeProc.stdout?.on("data", (d) => process.stdout.write(`[forge] ${d}`));
  forgeProc.stderr?.on("data", (d) => process.stderr.write(`[forge] ${d}`));

  // Save PID to file so globalTeardown can kill it (env vars don't survive across processes)
  fs.writeFileSync(PID_FILE, String(forgeProc.pid));

  // Don't let the forge process prevent our setup from exiting
  forgeProc.unref();

  await waitForServer(VITE_URL);
  console.log("[global-setup] Vite dev server is ready. Builds are up to date.");
}

export default globalSetup;
