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

test("model pill is visible in chat header", async () => {
  const modelPill = page.locator(".model-pill, .model-selector, [class*=model]").first();
  await expect(modelPill).toBeVisible({ timeout: 10000 });
});

test("clicking model pill shows dropdown", async () => {
  const modelPill = page.locator(".model-pill, .model-selector, [class*=model]").first();
  await modelPill.click();

  // Dropdown / popover with model options should appear
  const dropdown = page.locator(".model-dropdown, .model-list, [class*=dropdown]").first();
  await expect(dropdown).toBeVisible({ timeout: 5000 });
});

test("selecting a model closes dropdown", async () => {
  const modelPill = page.locator(".model-pill, .model-selector, [class*=model]").first();
  await modelPill.click();

  // Wait for dropdown
  const dropdown = page.locator(".model-dropdown, .model-list, [class*=dropdown]").first();
  await expect(dropdown).toBeVisible({ timeout: 5000 });

  // Click on a model option
  const option = dropdown.locator(".model-option, button, li").first();
  if (await option.isVisible()) {
    await option.click();
    // Dropdown should close
    await expect(dropdown).not.toBeVisible({ timeout: 3000 });
  }
});
