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

test("input textarea is focusable", async () => {
  const textarea = page.locator("textarea").first();
  await textarea.click();
  await expect(textarea).toBeFocused();
});

test("can type text into input", async () => {
  const textarea = page.locator("textarea").first();
  await textarea.fill("Hello 大师兄");
  await expect(textarea).toHaveValue("Hello 大师兄");
});

test("send button is disabled when input is empty", async () => {
  const textarea = page.locator("textarea").first();
  await textarea.fill("");
  const sendBtn = page.locator('button[title="发送"]');
  await expect(sendBtn).toBeDisabled();
});

test("send button is enabled with text", async () => {
  const textarea = page.locator("textarea").first();
  await textarea.fill("测试消息");
  const sendBtn = page.locator('button[title="发送"]');
  await expect(sendBtn).toBeEnabled();
});

test("clicking send adds message to chat", async () => {
  const textarea = page.locator("textarea").first();
  await textarea.fill("测试消息");
  const sendBtn = page.locator('button[title="发送"]');
  await sendBtn.click();

  // User message should appear in message list
  const userMsg = page.locator(".from-user, .msg").first();
  await expect(userMsg).toBeVisible({ timeout: 5000 });
});

test("input hint text is visible", async () => {
  const hint = page.locator(".input-hint, text=Enter 发送").first();
  await expect(hint).toBeVisible();
});
