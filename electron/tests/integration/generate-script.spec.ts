import { test, expect } from "@playwright/test";
import fs from "fs";
import {
  launchApp,
  sendPrompt,
  waitForFile,
  autoRespondDecisions,
  cleanOutput,
  waitForIdle,
  switchModel,
  getOutputDir,
} from "./helpers";
import type { ElectronApplication, Page } from "@playwright/test";

let app: ElectronApplication;
let page: Page;
let stopAutoRespond: () => void;

const OUTPUT = getOutputDir();

test.beforeAll(async () => {
  cleanOutput(OUTPUT);
  ({ app, page } = await launchApp());
  await switchModel(page); // default: MiniMax-M2.1 (free, avoids Claude API cost)
  stopAutoRespond = autoRespondDecisions(page);
});

test.afterAll(async () => {
  stopAutoRespond?.();
  await app?.close();
});

test("generate a Python script", async () => {
  await sendPrompt(
    page,
    "帮我写一个 Python 脚本，生成一组随机数据并画一个简单的折线图保存为 PNG，保存到 output 目录"
  );

  const filePath = await waitForFile(OUTPUT, /\.py$/i);

  // Verify file exists and has meaningful content
  const stat = fs.statSync(filePath);
  expect(stat.size).toBeGreaterThan(200);

  const content = fs.readFileSync(filePath, "utf-8");
  expect(content).toContain("import");
});
