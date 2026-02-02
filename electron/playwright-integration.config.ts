import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/integration",
  timeout: 300_000,
  retries: 0,
  workers: 1,
  globalSetup: "./tests/integration/global-setup.ts",
  globalTeardown: "./tests/integration/global-teardown.ts",
  use: {
    trace: "on",
  },
  reporter: [["list"], ["html", { open: "never" }]],
});
