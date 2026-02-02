import { _electron as electron } from "@playwright/test";
import type { Page, ElectronApplication } from "@playwright/test";
import path from "path";
import fs from "fs";

const MAIN_JS = path.join(__dirname, "../../.vite/build/main.js");
const OUTPUT_DIR = "/Users/wangjinbo/Desktop/skillsForPaper/output";

/** Default non-Claude model. MiniMax is free tier. Override via TEST_MODEL env var. */
const DEFAULT_MODEL = process.env.TEST_MODEL ?? "MiniMax-M2.1";

/**
 * Launch the Electron app and wait for the first window to be ready.
 */
export async function launchApp(): Promise<{
  app: ElectronApplication;
  page: Page;
}> {
  const app = await electron.launch({
    args: [MAIN_JS],
    env: { ...process.env, NODE_ENV: "development" },
  });

  // The built main.js opens DevTools in detached mode, so firstWindow() may
  // return the DevTools window. Wait for the actual app window (localhost:5173).
  let page: Page | null = null;
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    const windows = app.windows();
    for (const w of windows) {
      const url = w.url();
      if (url.includes("localhost:5173")) {
        page = w;
        break;
      }
    }
    if (page) break;

    // Wait for new windows to appear
    await Promise.race([
      app.waitForEvent("window", { timeout: 5_000 }).catch(() => null),
      sleep(1_000),
    ]);
  }

  if (!page) {
    const urls = app.windows().map((w) => w.url());
    throw new Error(`App window not found. Open windows: ${JSON.stringify(urls)}`);
  }

  await page.waitForLoadState("domcontentloaded");

  // Capture console errors for debugging
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  // Wait for the input area to appear — signals the UI is ready
  try {
    await page.locator("textarea").waitFor({ state: "visible", timeout: 60_000 });
  } catch (err) {
    const html = await page.content().catch(() => "(failed)");
    console.error("[launchApp] textarea not found. URL:", page.url());
    console.error("[launchApp] Console errors:", consoleErrors.join("\n"));
    console.error("[launchApp] HTML (first 3000):", html.slice(0, 3000));
    await page.screenshot({ path: "/tmp/integration-debug.png" }).catch(() => {});
    throw err;
  }
  return { app, page };
}

/**
 * Type a prompt into the textarea and click the send button.
 */
export async function sendPrompt(page: Page, text: string): Promise<void> {
  const textarea = page.locator("textarea");
  await textarea.waitFor({ state: "visible", timeout: 10_000 });
  await textarea.fill(text);
  // Click the send button (circle-btn send with ArrowUp icon)
  const sendBtn = page.locator("button.circle-btn.send");
  await sendBtn.click();
}

/**
 * Poll the output directory until a file matching `pattern` appears.
 * Returns the full path of the first match.
 */
export async function waitForFile(
  dir: string,
  pattern: RegExp,
  timeout = 240_000
): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      const match = files.find((f) => pattern.test(f));
      if (match) return path.join(dir, match);
    }
    await sleep(2_000);
  }
  throw new Error(
    `Timed out waiting for file matching ${pattern} in ${dir} after ${timeout}ms`
  );
}

/**
 * Continuously watch for DecisionCard prompts and auto-click the first option.
 * Returns a cleanup function to stop watching.
 */
export function autoRespondDecisions(page: Page): () => void {
  let running = true;

  const poll = async () => {
    while (running) {
      try {
        // Look for unanswered decision cards (no "answered" class)
        const cards = page.locator(".decision-card:not(.answered)");
        const count = await cards.count();
        for (let i = 0; i < count; i++) {
          const firstOption = cards.nth(i).locator(".dc-option").first();
          if (await firstOption.isVisible()) {
            await firstOption.click();
            // small delay after clicking to let the UI update
            await sleep(500);
          }
        }
      } catch {
        // Page might be navigating or closing; ignore
      }
      await sleep(1_000);
    }
  };

  poll();

  return () => {
    running = false;
  };
}

/**
 * Clean the output directory: remove all files but keep .gitkeep.
 */
export function cleanOutput(dir: string = OUTPUT_DIR): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    return;
  }
  for (const file of fs.readdirSync(dir)) {
    if (file === ".gitkeep") continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isFile()) {
      fs.unlinkSync(fullPath);
    }
  }
}

/**
 * Wait for the agent to finish streaming (the send button with ArrowUp reappears,
 * meaning isStreaming is false and textarea is enabled again).
 */
export async function waitForIdle(
  page: Page,
  timeout = 240_000
): Promise<void> {
  const start = Date.now();
  // First, wait a moment for streaming to actually begin
  await sleep(3_000);

  while (Date.now() - start < timeout) {
    try {
      // When idle, the textarea is enabled and the send button has the ArrowUp icon
      // (not the Square/stop icon). Check that textarea is not disabled.
      const disabled = await page.locator("textarea").getAttribute("disabled");
      if (disabled === null) {
        // Double-check: the stop button (red square) should not be visible
        const stopBtn = page.locator("button.circle-btn.send[style*='red']");
        const stopVisible = await stopBtn.isVisible().catch(() => false);
        if (!stopVisible) return;
      }
    } catch {
      // ignore transient errors
    }
    await sleep(2_000);
  }
  throw new Error(`Agent did not return to idle within ${timeout}ms`);
}

/**
 * Switch the active model via the renderer's window.api.setModel().
 * Defaults to MiniMax-M2.1 (free tier) to avoid Claude API costs.
 */
export async function switchModel(
  page: Page,
  modelId: string = DEFAULT_MODEL
): Promise<void> {
  const result = await page.evaluate(async (id) => {
    return await (window as any).api.setModel(id);
  }, modelId);
  // Short pause for the backend to finish switching
  await sleep(1_000);
  console.log(`Switched model to: ${result?.model ?? modelId}`);
}

export function getOutputDir(): string {
  return OUTPUT_DIR;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
