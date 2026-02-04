import { BrowserWindow } from "electron";
import { EventEmitter } from "events";
import { execSync } from "child_process";
import { createRequire } from "module";
import * as path from "path";
import * as fs from "fs";
import WebSocket from "ws";
import type { Readable } from "stream";

// ── ASR Protocol Types (inline to avoid cross-project imports) ──

interface VoiceConfig {
  model: string;
  sampleRate: number;
  chunkSize: number;
  language: string;
  wsBaseUrl: string;
  silenceDurationMs: number;
}

const DEFAULT_CONFIG: VoiceConfig = {
  model: "qwen3-asr-flash-realtime",
  sampleRate: 16000,
  chunkSize: 3200,
  language: "zh",
  wsBaseUrl: "wss://dashscope.aliyuncs.com/api-ws/v1/realtime",
  silenceDurationMs: 100,
};

let eventSeq = 0;
function nextEventId(): string {
  return `evt_${Date.now()}_${++eventSeq}`;
}

export class VoiceHandler {
  private window: BrowserWindow;
  private ws: WebSocket | null = null;
  private recorder: { stream: Readable; stop: () => void } | null = null;
  private completedTexts: string[] = [];
  private isRecording = false;

  constructor(window: BrowserWindow) {
    this.window = window;
  }

  private get apiKey(): string {
    return process.env.DASHSCOPE_API_KEY || "";
  }

  private getSoxDir(): string | null {
    if (process.platform !== "win32") return null;
    const dir = path.join(process.resourcesPath, "sox-win32");
    return fs.existsSync(dir) ? dir : null;
  }

  isAvailable(): boolean {
    if (!this.apiKey) return false;
    try {
      if (process.platform === "win32") {
        const soxDir = this.getSoxDir();
        if (soxDir && fs.existsSync(path.join(soxDir, "sox.exe"))) return true;
        execSync("where sox", { stdio: "ignore" });
      } else {
        execSync("which rec", { stdio: "ignore" });
      }
      return true;
    } catch {
      return false;
    }
  }

  async start(): Promise<{ ok: boolean; error?: string }> {
    if (this.isRecording) {
      return { ok: false, error: "Already recording" };
    }

    if (!this.apiKey) {
      return { ok: false, error: "DASHSCOPE_API_KEY not set" };
    }

    try {
      if (process.platform === "win32") {
        const soxDir = this.getSoxDir();
        if (!(soxDir && fs.existsSync(path.join(soxDir, "sox.exe")))) {
          execSync("where sox", { stdio: "ignore" });
        }
      } else {
        execSync("which rec", { stdio: "ignore" });
      }
    } catch {
      const hint = process.platform === "win32"
        ? "SoX not found. Place sox.exe in the sox-win32 resource folder, or install SoX and add it to PATH"
        : "SoX not installed. Run: brew install sox";
      return { ok: false, error: hint };
    }

    this.completedTexts = [];
    this.isRecording = true;

    try {
      // Connect ASR
      await this.connectAsr();

      // Start recording
      this.startRecording();

      return { ok: true };
    } catch (err: any) {
      this.cleanup();
      return { ok: false, error: err.message || "Failed to start voice input" };
    }
  }

  async stop(): Promise<{ text: string; error?: string }> {
    if (!this.isRecording) {
      return { text: "", error: "Not recording" };
    }

    try {
      // Stop recorder first
      if (this.recorder) {
        this.recorder.stop();
        this.recorder = null;
      }

      // Send finish to ASR and wait for final text
      const text = await this.finishAsr();
      this.cleanup();
      return { text };
    } catch (err: any) {
      this.cleanup();
      return { text: this.completedTexts.join(""), error: err.message };
    }
  }

  cancel(): void {
    this.cleanup();
  }

  private connectAsr(): Promise<void> {
    return new Promise((resolve, reject) => {
      const config = DEFAULT_CONFIG;
      const wsUrl = `${config.wsBaseUrl}?model=${config.model}`;

      this.ws = new WebSocket(wsUrl, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "OpenAI-Beta": "realtime=v1",
        },
      });

      const timeout = setTimeout(() => {
        reject(new Error("ASR connection timeout"));
        this.ws?.close();
      }, 15000);

      this.ws.on("open", () => {
        this.sendEvent({
          event_id: nextEventId(),
          type: "session.update",
          session: {
            modalities: ["text"],
            input_audio_format: "pcm",
            sample_rate: config.sampleRate,
            input_audio_transcription: { language: config.language },
            turn_detection: {
              type: "server_vad",
              threshold: 0.0,
              silence_duration_ms: config.silenceDurationMs,
            },
          },
        });
      });

      this.ws.on("message", (data: WebSocket.Data) => {
        try {
          const event = JSON.parse(data.toString());
          this.handleServerEvent(event);
          if (event.type === "session.created") {
            clearTimeout(timeout);
            resolve();
          }
        } catch {
          // ignore parse errors
        }
      });

      this.ws.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      this.ws.on("close", (code) => {
        if (code !== 1000 && this.isRecording) {
          this.notifyRenderer("voice:error", "ASR connection lost");
          this.cleanup();
        }
      });
    });
  }

  private handleServerEvent(event: any): void {
    switch (event.type) {
      case "conversation.item.input_audio_transcription.text":
        this.notifyRenderer("voice:interim", event.text || "");
        break;

      case "conversation.item.input_audio_transcription.completed":
        if (event.transcript) {
          this.completedTexts.push(event.transcript);
          this.notifyRenderer("voice:completed", event.transcript);
        }
        break;

      case "input_audio_buffer.speech_started":
        this.notifyRenderer("voice:speech-started", null);
        break;

      case "error":
        this.notifyRenderer(
          "voice:error",
          event.error?.message || "ASR error"
        );
        break;
    }
  }

  private startRecording(): void {
    const soxDir = this.getSoxDir();
    if (soxDir) {
      process.env.PATH = soxDir + path.delimiter + (process.env.PATH || "");
    }

    const require_ = createRequire(import.meta.url);
    const { record } = require_("node-record-lpcm16") as any;

    const recording = record({
      sampleRate: DEFAULT_CONFIG.sampleRate,
      channels: 1,
      audioType: "raw",
      recorder: process.platform === "win32" ? "sox" : "rec",
    });

    const stream: Readable = recording.stream();

    stream.on("data", (chunk: Buffer) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.sendEvent({
          event_id: nextEventId(),
          type: "input_audio_buffer.append",
          audio: chunk.toString("base64"),
        });
      }
    });

    stream.on("error", (err: Error) => {
      console.error("[voice] Recording error:", err.message);
    });

    this.recorder = { stream, stop: () => recording.stop() };
  }

  private finishAsr(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        resolve(this.completedTexts.join(""));
        return;
      }

      const timeout = setTimeout(() => {
        resolve(this.completedTexts.join(""));
      }, 8000);

      const handler = (data: WebSocket.Data) => {
        try {
          const event = JSON.parse(data.toString());
          if (event.type === "conversation.item.input_audio_transcription.completed") {
            if (event.transcript) this.completedTexts.push(event.transcript);
          }
          if (event.type === "session.finished") {
            clearTimeout(timeout);
            this.ws?.removeListener("message", handler);
            resolve(this.completedTexts.join(""));
          }
        } catch {
          // ignore
        }
      };

      this.ws.on("message", handler);

      this.sendEvent({
        event_id: nextEventId(),
        type: "session.finish",
      });
    });
  }

  private sendEvent(event: object): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    }
  }

  private notifyRenderer(channel: string, data: any): void {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send(channel, data);
    }
  }

  private cleanup(): void {
    this.isRecording = false;
    if (this.recorder) {
      try { this.recorder.stop(); } catch {}
      this.recorder = null;
    }
    if (this.ws) {
      try { this.ws.close(1000); } catch {}
      this.ws = null;
    }
  }
}
