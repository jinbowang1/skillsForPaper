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

test("generate a Word document (docx)", async () => {
  await sendPrompt(
    page,
    "帮我生成一份简短的开题报告 word 文档，主题是基于CNN的图像分类研究，请使用 docx skill 生成真正的 Word 文件"
  );

  // Wait for the file to appear
  const filePath = await waitForFile(OUTPUT, /\.docx$/i);

  // Verify file exists and has reasonable size
  const stat = fs.statSync(filePath);
  expect(stat.size).toBeGreaterThan(500);

  // DOCX is a ZIP archive — verify the first bytes are PK (ZIP magic bytes)
  const buf = Buffer.alloc(4);
  const fd = fs.openSync(filePath, "r");
  fs.readSync(fd, buf, 0, 4, 0);
  fs.closeSync(fd);
  expect(buf[0]).toBe(0x50); // P
  expect(buf[1]).toBe(0x4b); // K
});
