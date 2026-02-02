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

test("generate a PDF document", async () => {
  await sendPrompt(
    page,
    "帮我生成一份关于机器学习基础的简短 PDF 文档"
  );

  const filePath = await waitForFile(OUTPUT, /\.pdf$/i);

  // Verify file exists and has reasonable size
  const stat = fs.statSync(filePath);
  expect(stat.size).toBeGreaterThan(1024);

  // Verify PDF magic bytes: %PDF
  const buf = Buffer.alloc(4);
  const fd = fs.openSync(filePath, "r");
  fs.readSync(fd, buf, 0, 4, 0);
  fs.closeSync(fd);
  expect(buf.toString("ascii")).toBe("%PDF");
});
