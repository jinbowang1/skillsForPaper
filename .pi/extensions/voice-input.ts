/**
 * voice-input — 语音输入扩展
 *
 * 按 Ctrl+Shift+V 启动麦克风录音，实时 ASR 转写（Qwen3-ASR），
 * 结果直接填入编辑器输入框。按 Enter 停止并确认，Esc 取消。
 *
 * 所有重依赖（ws、node-record-lpcm16）延迟到用户触发时才加载，
 * 避免 jiti 环境下顶层 import 失败导致扩展无法注册。
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Key, matchesKey, truncateToWidth } from "@mariozechner/pi-tui";
import { EventEmitter } from "events";
import { execSync } from "child_process";

// ── 懒加载辅助 ──

function loadWs(): typeof import("ws").default {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("ws") as typeof import("ws").default;
}

function loadNodeRecord(): typeof import("node-record-lpcm16") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("node-record-lpcm16") as typeof import("node-record-lpcm16");
}

// ── Recorder ──

function isSoxInstalled(): boolean {
  try {
    execSync("which rec", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function startRecording(sampleRate: number) {
  const nodeRecord = loadNodeRecord();
  const recording = nodeRecord.record({
    sampleRate,
    channels: 1,
    audioType: "raw",
    recorder: "rec",
  });
  const stream = recording.stream();
  // 必须挂 error 监听，否则 rec 失败会抛 unhandled error 崩掉整个进程
  stream.on("error", () => {});
  return {
    stream,
    stop: () => { try { recording.stop(); } catch {} },
  };
}

// ── ASR Client ──

let eventSeq = 0;
function nextEventId(): string {
  return `evt_${Date.now()}_${++eventSeq}`;
}

class AsrClient extends EventEmitter {
  private ws: InstanceType<typeof import("ws").default> | null = null;
  private completedTexts: string[] = [];

  constructor(
    private apiKey: string,
    private language: string,
  ) {
    super();
  }

  connect(): Promise<void> {
    const WebSocket = loadWs();
    return new Promise((resolve, reject) => {
      // 10 秒连接超时
      const connectTimeout = setTimeout(() => {
        this.close();
        reject(new Error("连接超时（10s）"));
      }, 10000);

      const wsUrl = `wss://dashscope.aliyuncs.com/api-ws/v1/realtime?model=qwen3-asr-flash-realtime`;
      this.ws = new WebSocket(wsUrl, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "OpenAI-Beta": "realtime=v1",
        },
      });

      this.ws.on("open", () => {
        this.send({
          event_id: nextEventId(),
          type: "session.update",
          session: {
            modalities: ["text"],
            input_audio_format: "pcm",
            sample_rate: 16000,
            input_audio_transcription: { language: this.language },
            turn_detection: {
              type: "server_vad",
              threshold: 0.0,
              silence_duration_ms: 400,
            },
          },
        });
      });

      this.ws.on("message", (data: any) => {
        try {
          const ev = JSON.parse(data.toString());
          switch (ev.type) {
            case "session.created":
              clearTimeout(connectTimeout);
              resolve();
              break;
            case "conversation.item.input_audio_transcription.text":
              this.emit("interim", ev.text ?? "");
              break;
            case "conversation.item.input_audio_transcription.completed":
              this.completedTexts.push(ev.transcript ?? "");
              this.emit("completed", ev.transcript ?? "");
              break;
            case "session.finished":
              this.emit("finished");
              break;
            case "error":
              this.emit("error", new Error(`ASR [${ev.error?.code}]: ${ev.error?.message}`));
              break;
          }
        } catch {}
      });

      this.ws.on("error", (err: any) => {
        clearTimeout(connectTimeout);
        reject(err);
      });
      this.ws.on("close", (code: number, reason: any) => {
        clearTimeout(connectTimeout);
        if (code !== 1000) {
          this.emit("error", new Error(`WS closed: ${code} ${reason?.toString()}`));
        }
      });
    });
  }

  sendAudio(chunk: Buffer): void {
    this.send({
      event_id: nextEventId(),
      type: "input_audio_buffer.append",
      audio: chunk.toString("base64"),
    });
  }

  finish(): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("finish timeout")), 10000);
      this.once("finished", () => {
        clearTimeout(timeout);
        resolve(this.completedTexts.join(""));
        this.close();
      });
      this.once("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
      this.send({ event_id: nextEventId(), type: "session.finish" });
    });
  }

  getFullText(): string {
    return this.completedTexts.join("");
  }

  private send(event: object): void {
    const WebSocket = loadWs();
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(event));
    }
  }

  close(): void {
    if (this.ws) {
      this.ws.close(1000);
      this.ws = null;
    }
  }
}

// ── Extension Entry ──

export default function voiceInput(pi: ExtensionAPI) {
  let language = "zh";

  // 核心逻辑抽出来，command 和 shortcut 都能调
  async function handleVoice(ctx: any) {
      // 预检
      if (!isSoxInstalled()) {
        ctx.ui.notify("SoX 未安装，请运行: brew install sox", "error");
        return;
      }
      const apiKey = process.env.DASHSCOPE_API_KEY;
      if (!apiKey) {
        ctx.ui.notify("DASHSCOPE_API_KEY 未设置，请在 .env 中添加", "error");
        return;
      }

      // 检查依赖是否可用
      try {
        loadWs();
        loadNodeRecord();
      } catch (err) {
        ctx.ui.notify(`缺少依赖，请运行: npm install ws node-record-lpcm16`, "error");
        return;
      }

      // 连接 ASR
      ctx.ui.notify("正在连接语音识别...");
      const asr = new AsrClient(apiKey, language);
      try {
        await asr.connect();
      } catch (err) {
        ctx.ui.notify(`ASR 连接失败: ${err}`, "error");
        return;
      }

      // 开始录音
      let recorder: ReturnType<typeof startRecording>;
      try {
        recorder = startRecording(16000);
      } catch (err) {
        ctx.ui.notify(`录音启动失败: ${err}`, "error");
        asr.close();
        return;
      }
      const CHUNK_SIZE = 3200;
      let audioBuf = Buffer.alloc(0);
      let recError = "";

      recorder.stream.on("data", (data: Buffer) => {
        audioBuf = Buffer.concat([audioBuf, data]);
        while (audioBuf.length >= CHUNK_SIZE) {
          asr.sendAudio(audioBuf.subarray(0, CHUNK_SIZE));
          audioBuf = audioBuf.subarray(CHUNK_SIZE);
        }
      });

      recorder.stream.on("error", (err: Error) => {
        recError = err.message || "录音设备错误";
      });

      // 显示录音 overlay UI
      const result = await ctx.ui.custom<string | null>(
        (tui, theme, _kb, done) => {
          let interimText = "";
          let completedLines: string[] = [];
          let cache: string[] | undefined;
          let finished = false;

          function invalidate() {
            cache = undefined;
            tui.requestRender();
          }

          asr.on("interim", (text: string) => {
            interimText = text;
            invalidate();
          });

          asr.on("completed", (text: string) => {
            if (text) completedLines.push(text);
            interimText = "";
            invalidate();
          });

          asr.on("error", () => invalidate());

          const timer = setTimeout(() => {
            if (!finished) {
              finished = true;
              cleanup();
              done(getAllText());
            }
          }, 5 * 60 * 1000);

          function getAllText(): string {
            return completedLines.join("");
          }

          function cleanup() {
            clearTimeout(timer);
            recorder.stop();
            if (audioBuf.length > 0) {
              asr.sendAudio(audioBuf);
              audioBuf = Buffer.alloc(0);
            }
          }

          async function stopAndFinish() {
            if (finished) return;
            finished = true;
            cleanup();
            try {
              const text = await asr.finish();
              done(text || getAllText());
            } catch {
              done(getAllText());
            }
          }

          function cancel() {
            if (finished) return;
            finished = true;
            cleanup();
            asr.close();
            done(null);
          }

          function handleInput(data: string) {
            if (matchesKey(data, Key.enter)) {
              stopAndFinish();
              return;
            }
            if (matchesKey(data, Key.escape)) {
              cancel();
              return;
            }
          }

          function render(width: number): string[] {
            if (cache) return cache;
            const lines: string[] = [];
            const add = (s: string) => lines.push(truncateToWidth(s, width));

            add(theme.fg("accent", "─".repeat(width)));
            add(theme.fg("accent", " 🎤 语音输入") + theme.fg("muted", `  [${language === "zh" ? "中文" : "English"}]`));
            add("");

            if (completedLines.length > 0) {
              const fullText = completedLines.join("");
              const displayWidth = width - 4;
              for (let i = 0; i < fullText.length; i += displayWidth) {
                add("  " + theme.fg("text", fullText.slice(i, i + displayWidth)));
              }
            }

            if (interimText) {
              const displayWidth = width - 4;
              for (let i = 0; i < interimText.length; i += displayWidth) {
                add("  " + theme.fg("muted", interimText.slice(i, i + displayWidth)));
              }
            }

            if (recError) {
              add("  " + theme.fg("warning", `⚠ ${recError}`));
              add("  " + theme.fg("warning", "请检查: 系统设置 → 隐私与安全 → 麦克风 → 允许终端"));
            } else if (completedLines.length === 0 && !interimText) {
              add(theme.fg("dim", "  请说话..."));
            }

            add("");
            add(theme.fg("dim", " Enter 停止并填入 · Esc 取消"));
            add(theme.fg("accent", "─".repeat(width)));

            cache = lines;
            return lines;
          }

          return {
            render,
            invalidate: () => { cache = undefined; },
            handleInput,
            dispose: () => {
              if (!finished) {
                finished = true;
                cleanup();
                asr.close();
              }
            },
          };
        },
        { overlay: true },
      );

      // 结果写入编辑器
      if (result && result.length > 0) {
        const existing = ctx.ui.getEditorText();
        if (existing.length > 0) {
          ctx.ui.setEditorText(existing + result);
        } else {
          ctx.ui.setEditorText(result);
        }
        ctx.ui.notify(`语音输入完成（${result.length} 字）`);
      }
  }

  // /voice 命令 — 最可靠的触发方式
  pi.registerCommand("voice", {
    description: "语音输入（开始录音，说完按 Enter）",
    handler: async (args, ctx) => {
      // /voice en 或 /voice zh 可以临时切语言
      const lang = args.trim();
      if (lang === "en" || lang === "zh") {
        language = lang;
      }
      await handleVoice(ctx);
    },
  });

  // 同时注册快捷键（终端不一定能触发）
  pi.registerShortcut("alt+v", {
    description: "语音输入",
    handler: async (ctx) => {
      await handleVoice(ctx);
    },
  });
}
