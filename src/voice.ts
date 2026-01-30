#!/usr/bin/env node

// 复用项目 config.ts 加载 .env
import "./config.js";

import { AsrClient } from "./voice/asr-client.js";
import { copyToClipboard } from "./voice/clipboard.js";
import { isSoxInstalled, startRecording } from "./voice/recorder.js";
import { DEFAULT_VOICE_CONFIG, type VoiceConfig } from "./voice/types.js";

// ── CLI argument parsing ──

function parseArgs(): { lang: string; pipe: boolean } {
  const args = process.argv.slice(2);
  let lang = DEFAULT_VOICE_CONFIG.language;
  let pipe = false;

  for (const arg of args) {
    if (arg.startsWith("--lang=")) {
      lang = arg.slice("--lang=".length);
    } else if (arg === "--pipe") {
      pipe = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(`Usage: paper-voice [options]

Options:
  --lang=CODE   Set recognition language (default: zh)
  --pipe        Pipe mode: output plain text to stdout, no colors
  -h, --help    Show this help message`);
      process.exit(0);
    }
  }

  return { lang, pipe };
}

// ── Terminal UI helpers ──

const GRAY = "\x1b[90m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";
const CLEAR_LINE = "\x1b[2K\r";

function log(msg: string, pipe: boolean): void {
  if (!pipe) {
    process.stderr.write(msg);
  }
}

// ── Main ──

async function main(): Promise<void> {
  const { lang, pipe } = parseArgs();

  if (!isSoxInstalled()) {
    console.error("Error: SoX is not installed. Please run: brew install sox");
    process.exit(1);
  }

  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    console.error(
      "Error: DASHSCOPE_API_KEY not found. Set it in .env or environment.",
    );
    process.exit(1);
  }

  const voiceConfig: VoiceConfig = {
    ...DEFAULT_VOICE_CONFIG,
    language: lang,
  };

  log(`${CYAN}Connecting to Qwen3-ASR...${RESET}\n`, pipe);

  const asr = new AsrClient(voiceConfig, apiKey);

  asr.on("error", (err) => {
    log(`\n${YELLOW}ASR error: ${err.message}${RESET}\n`, pipe);
  });

  try {
    await asr.connect();
  } catch (err) {
    console.error(
      `Failed to connect to ASR: ${err instanceof Error ? err.message : err}`,
    );
    process.exit(1);
  }

  log(
    `${GREEN}Connected.${RESET} Listening... (press ${CYAN}Enter${RESET} or ${CYAN}Ctrl+C${RESET} to stop)\n\n`,
    pipe,
  );

  const recorder = startRecording(voiceConfig.sampleRate);

  const { chunkSize } = voiceConfig;
  let buffer = Buffer.alloc(0);

  recorder.stream.on("data", (data: Buffer) => {
    buffer = Buffer.concat([buffer, data]);
    while (buffer.length >= chunkSize) {
      const chunk = buffer.subarray(0, chunkSize);
      buffer = buffer.subarray(chunkSize);
      asr.sendAudio(chunk);
    }
  });

  recorder.stream.on("error", (err) => {
    log(`\n${YELLOW}Recording error: ${err.message}${RESET}\n`, pipe);
  });

  asr.on("interim", (text) => {
    if (!pipe) {
      process.stderr.write(`${CLEAR_LINE}${GRAY}${text}${RESET}`);
    }
  });

  asr.on("completed", (text) => {
    if (pipe) {
      process.stdout.write(text);
    } else {
      process.stderr.write(`${CLEAR_LINE}${GREEN}${text}${RESET}\n`);
    }
  });

  asr.on("speechStarted", () => {
    // VAD detected speech
  });

  const safetyTimer = setTimeout(() => {
    log(
      `\n${YELLOW}Safety timeout reached (5 min). Stopping...${RESET}\n`,
      pipe,
    );
    stopAndFinish();
  }, voiceConfig.timeoutMs);

  let stopping = false;

  async function stopAndFinish(): Promise<void> {
    if (stopping) return;
    stopping = true;
    clearTimeout(safetyTimer);

    recorder.stop();

    if (buffer.length > 0) {
      asr.sendAudio(buffer);
      buffer = Buffer.alloc(0);
    }

    log(`\n${CYAN}Finalizing transcription...${RESET}\n`, pipe);

    try {
      const fullText = await asr.finish();

      if (fullText.length > 0) {
        if (pipe) {
          process.stdout.write("\n");
        } else {
          log(`\n${GREEN}── Transcription ──${RESET}\n`, pipe);
          log(`${fullText}\n`, pipe);
          log(`${GREEN}───────────────────${RESET}\n\n`, pipe);

          if (copyToClipboard(fullText)) {
            log(`${CYAN}Copied to clipboard.${RESET}\n`, pipe);
          } else {
            log(`${YELLOW}Failed to copy to clipboard.${RESET}\n`, pipe);
          }
        }
      } else {
        log(`${YELLOW}No speech detected.${RESET}\n`, pipe);
      }
    } catch (err) {
      console.error(
        `Error during finalization: ${err instanceof Error ? err.message : err}`,
      );
    }

    process.exit(0);
  }

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("data", (key: Buffer) => {
      if (key[0] === 0x0d || key[0] === 0x0a || key[0] === 0x03) {
        stopAndFinish();
      }
    });
  }

  process.on("SIGINT", () => {
    stopAndFinish();
  });
}

main().catch((err) => {
  console.error(`Fatal error: ${err}`);
  process.exit(1);
});
