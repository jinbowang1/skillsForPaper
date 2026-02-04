import { execSync } from "child_process";
import { createRequire } from "module";
import { Readable } from "stream";

const require = createRequire(import.meta.url);
const { record } = require("node-record-lpcm16") as typeof import("node-record-lpcm16");

export interface RecorderHandle {
  stream: Readable;
  stop: () => void;
  pause: () => void;
  resume: () => void;
}

export function isSoxInstalled(): boolean {
  try {
    const cmd = process.platform === "win32" ? "where sox" : "which rec";
    execSync(cmd, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function startRecording(sampleRate: number = 16000): RecorderHandle {
  const recording = record({
    sampleRate,
    channels: 1,
    audioType: "raw",
    recorder: "rec",
  });

  return {
    stream: recording.stream(),
    stop: () => recording.stop(),
    pause: () => recording.pause(),
    resume: () => recording.resume(),
  };
}
