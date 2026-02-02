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

test("bookshelf sidebar is rendered", async () => {
  const sidebar = page.locator(".bookshelf, .shelf, [class*=shelf]").first();
  await expect(sidebar).toBeVisible({ timeout: 10000 });
});

test("user panel is displayed", async () => {
  const userPanel = page.locator(".shelf-footer, .user-row, [class*=user]").first();
  await expect(userPanel).toBeVisible({ timeout: 10000 });
});

test("user avatar is shown", async () => {
  const avatar = page.locator(".user-avatar").first();
  await expect(avatar).toBeVisible({ timeout: 10000 });
});

test("action buttons are present", async () => {
  const settingsBtn = page.locator('button[title="设置"]');
  const memoryBtn = page.locator('button[title="记忆"]');
  const helpBtn = page.locator('button[title="帮助"]');

  await expect(settingsBtn).toBeVisible({ timeout: 10000 });
  await expect(memoryBtn).toBeVisible({ timeout: 10000 });
  await expect(helpBtn).toBeVisible({ timeout: 10000 });
});
