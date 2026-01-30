#!/usr/bin/env node

/**
 * ASR 连接测试 — 验证 API Key 和 WebSocket 连通性。
 * 不需要麦克风，发送一段静音数据即可。
 */

import "./config.js";

import { AsrClient } from "./voice/asr-client.js";
import { DEFAULT_VOICE_CONFIG } from "./voice/types.js";

const GRAY = "\x1b[90m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";

async function main() {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    console.error(`${RED}✗ DASHSCOPE_API_KEY not set in .env${RESET}`);
    process.exit(1);
  }
  console.log(
    `${CYAN}[1/4]${RESET} API Key found: ${GRAY}${apiKey.slice(0, 8)}...${RESET}`,
  );

  console.log(
    `${CYAN}[2/4]${RESET} Connecting to ${DEFAULT_VOICE_CONFIG.wsBaseUrl}?model=${DEFAULT_VOICE_CONFIG.model} ...`,
  );
  const asr = new AsrClient(DEFAULT_VOICE_CONFIG, apiKey);

  asr.on("error", (err) => {
    console.error(`${RED}✗ ASR error: ${err.message}${RESET}`);
  });

  try {
    await asr.connect();
    console.log(`${GREEN}✓ WebSocket connected, session created${RESET}`);
  } catch (err) {
    console.error(
      `${RED}✗ Connection failed: ${err instanceof Error ? err.message : err}${RESET}`,
    );
    process.exit(1);
  }

  console.log(`${CYAN}[3/4]${RESET} Sending 0.5s silent audio ...`);
  const silentBytes = DEFAULT_VOICE_CONFIG.sampleRate * 2 * 0.5;
  const silentBuf = Buffer.alloc(silentBytes, 0);
  const chunkSize = DEFAULT_VOICE_CONFIG.chunkSize;
  for (let offset = 0; offset < silentBuf.length; offset += chunkSize) {
    const end = Math.min(offset + chunkSize, silentBuf.length);
    asr.sendAudio(silentBuf.subarray(offset, end));
  }
  console.log(
    `${GREEN}✓ Audio sent (${silentBuf.length} bytes, ${Math.ceil(silentBuf.length / chunkSize)} chunks)${RESET}`,
  );

  console.log(`${CYAN}[4/4]${RESET} Finishing session ...`);
  try {
    const text = await asr.finish();
    console.log(`${GREEN}✓ Session finished${RESET}`);
    if (text.length > 0) {
      console.log(`  Transcription: "${text}"`);
    } else {
      console.log(`  ${GRAY}(no speech in silent audio — expected)${RESET}`);
    }
  } catch (err) {
    console.error(
      `${RED}✗ Finish failed: ${err instanceof Error ? err.message : err}${RESET}`,
    );
    process.exit(1);
  }

  console.log(`\n${GREEN}All checks passed. Voice input is ready.${RESET}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(`${RED}Fatal: ${err}${RESET}`);
  process.exit(1);
});
