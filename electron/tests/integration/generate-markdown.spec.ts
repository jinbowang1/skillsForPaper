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

test("generate a markdown literature review", async () => {
  await sendPrompt(
    page,
    "帮我写一段关于深度学习在图像分类中应用的简短文献综述，直接保存为 markdown"
  );

  // Wait for a .md file to appear in the output directory
  const filePath = await waitForFile(OUTPUT, /\.md$/i);

  // Verify file exists and has meaningful content
  const stat = fs.statSync(filePath);
  expect(stat.size).toBeGreaterThan(500);

  const content = fs.readFileSync(filePath, "utf-8");
  expect(content).toContain("深度学习");
});
