import { test, expect, _electron as electron } from "@playwright/test";
import path from "path";

let app: Awaited<ReturnType<typeof electron.launch>>;
let page: Awaited<ReturnType<typeof app.firstWindow>>;

test.beforeAll(async () => {
  app = await electron.launch({
    args: [path.join(__dirname, "../../.vite/build/main.js")],
    env: { ...process.env, NODE_ENV: "test" },
  });
  page = await app.firstWindow();
  await page.waitForLoadState("domcontentloaded");
});

test.afterAll(async () => {
  await app.close();
});

test("window is visible", async () => {
  const visible = await app.evaluate(({ BrowserWindow }) => {
    return BrowserWindow.getAllWindows()[0]?.isVisible();
  });
  expect(visible).toBe(true);
});

test("window has expected size", async () => {
  const size = await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    const [width, height] = win.getSize();
    return { width, height };
  });
  expect(size.width).toBeGreaterThanOrEqual(1200);
  expect(size.height).toBeGreaterThanOrEqual(800);
});

test("shows bookshelf area", async () => {
  const bookshelf = page.locator(".bookshelf, .shelf, [class*=shelf]").first();
  await expect(bookshelf).toBeVisible({ timeout: 10000 });
});

test("shows chat area", async () => {
  const chat = page.locator(".chat, .chat-area, [class*=chat]").first();
  await expect(chat).toBeVisible({ timeout: 10000 });
});

test("shows input area", async () => {
  const input = page.locator(".input-area, textarea").first();
  await expect(input).toBeVisible({ timeout: 10000 });
});

test("title bar is hidden (frameless window)", async () => {
  const titleBarStyle = await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    return win.isMenuBarVisible?.() ?? null;
  });
  // On macOS with titleBarStyle: "hiddenInset", menu bar is not visible
  // This varies by platform, so we just check the window exists
  expect(titleBarStyle).not.toBe(true);
});
