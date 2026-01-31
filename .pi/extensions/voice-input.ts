/**
 * voice-input — 语音输入扩展（一键录音，Enter 停止）
 *
 * 按 Alt+V 或输入 /voice 立即开始录音，
 * 说完后按 Enter 停止并填入编辑器，Esc 取消。
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
          const err = new Error(`WS closed: ${code} ${reason?.toString()}`);
          this.emit("error", err);
          reject(err);
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
      const timeout = setTimeout(() => {
        this.close();
        reject(new Error("finish timeout"));
      }, 10000);
      this.once("finished", () => {
        clearTimeout(timeout);
        resolve(this.completedTexts.join(""));
        this.close();
      });
      this.once("error", (err) => {
        clearTimeout(timeout);
        this.close();
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
      const ws = this.ws;
      this.ws = null;
      try { ws.close(1000); } catch {}
      // 如果 2 秒内没关掉，强制终止
      setTimeout(() => {
        try { ws.terminate(); } catch {}
      }, 2000);
    }
  }
}

// ── Extension Entry ──

export default function voiceInput(pi: ExtensionAPI) {
  let language = "zh";

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

      // 连接 ASR + 立即开始录音
      ctx.ui.notify("正在连接语音识别...");
      const asr = new AsrClient(apiKey, language);
      try {
        await asr.connect();
      } catch (err) {
        ctx.ui.notify(`ASR 连接失败: ${err}`, "error");
        return;
      }

      // 一键录音 overlay：进入即录，Enter 停止，Esc 取消
      const result = await ctx.ui.custom<string | null>(
        (tui: any, theme: any, _kb: any, done: (result: string | null) => void) => {
          let recorder: ReturnType<typeof startRecording> | null = null;
          const CHUNK_SIZE = 3200;
          let audioBuf = Buffer.alloc(0);
          let interimText = "";
          let completedLines: string[] = [];
          let isRecording = false;
          let finished = false;
          let doneCalled = false;
          let recError = "";
          let statusText = "";
          let cache: string[] | undefined;

          function safeDone(result: string | null) {
            if (doneCalled) return;
            doneCalled = true;
            done(result);
          }

          function invalidate() {
            cache = undefined;
            tui.requestRender();
          }

          function onInterim(text: string) {
            if (doneCalled) return;
            interimText = text;
            invalidate();
          }
          function onCompleted(text: string) {
            if (doneCalled) return;
            if (text) completedLines.push(text);
            interimText = "";
            invalidate();
          }
          function onError() {
            if (doneCalled) return;
            invalidate();
          }

          asr.on("interim", onInterim);
          asr.on("completed", onCompleted);
          asr.on("error", onError);

          function removeAsrListeners() {
            asr.off("interim", onInterim);
            asr.off("completed", onCompleted);
            asr.off("error", onError);
          }

          function getAllText(): string {
            return completedLines.join("");
          }

          function startRec() {
            if (isRecording) return;
            try {
              recorder = startRecording(16000);
              isRecording = true;
              recError = "";

              recorder.stream.on("data", (data: Buffer) => {
                if (!isRecording) return;
                audioBuf = Buffer.concat([audioBuf, data]);
                while (audioBuf.length >= CHUNK_SIZE) {
                  asr.sendAudio(audioBuf.subarray(0, CHUNK_SIZE));
                  audioBuf = audioBuf.subarray(CHUNK_SIZE);
                }
              });

              recorder.stream.on("error", (err: Error) => {
                recError = err.message || "录音设备错误";
                invalidate();
              });

              invalidate();
            } catch (err: any) {
              recError = `录音启动失败: ${err?.message || err}`;
              invalidate();
            }
          }

          function stopRec() {
            if (!isRecording || !recorder) return;
            isRecording = false;
            try { recorder.stop(); } catch {}
            try { recorder.stream.destroy(); } catch {}
            recorder = null;
            if (audioBuf.length > 0) {
              asr.sendAudio(audioBuf);
              audioBuf = Buffer.alloc(0);
            }
          }

          function cleanup() {
            stopRec();
            removeAsrListeners();
            asr.close();
          }

          async function finishAndDone() {
            if (finished) return;
            finished = true;
            stopRec();
            statusText = "正在识别...";
            invalidate();

            const hardTimeout = setTimeout(() => {
              removeAsrListeners();
              asr.close();
              safeDone(getAllText() || null);
            }, 5000);

            try {
              const text = await asr.finish();
              clearTimeout(hardTimeout);
              removeAsrListeners();
              safeDone(text || getAllText() || null);
            } catch {
              clearTimeout(hardTimeout);
              removeAsrListeners();
              asr.close();
              safeDone(getAllText() || null);
            }
          }

          function cancel() {
            if (finished) return;
            finished = true;
            cleanup();
            safeDone(null);
          }

          function handleInput(data: string) {
            if (finished) return;

            // Esc → 取消
            if (matchesKey(data, Key.escape)) {
              cancel();
              return;
            }

            // Enter → 停止录音并提交
            if (matchesKey(data, Key.return)) {
              finishAndDone();
              return;
            }
          }

          function render(width: number): string[] {
            if (cache) return cache;
            const lines: string[] = [];
            const add = (s: string) => lines.push(truncateToWidth(s, width));

            add(theme.fg("accent", "─".repeat(width)));

            if (statusText) {
              add(theme.fg("accent", ` 🎤 ${statusText}`));
            } else if (isRecording) {
              add(theme.fg("accent", " 🔴 正在录音") + theme.fg("muted", `  [${language === "zh" ? "中文" : "English"}]`));
            } else {
              add(theme.fg("accent", " 🎤 语音输入") + theme.fg("muted", `  [${language === "zh" ? "中文" : "English"}]`));
            }
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
            }

            add("");
            if (!statusText) {
              add(theme.fg("dim", " Enter 停止 · Esc 取消"));
            }
            add(theme.fg("accent", "─".repeat(width)));

            cache = lines;
            return lines;
          }

          // 立即开始录音
          startRec();

          return {
            render,
            invalidate: () => { cache = undefined; },
            handleInput,
            dispose: () => {
              finished = true;
              cleanup();
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

  // /voice 命令
  pi.registerCommand("voice", {
    description: "语音输入（Alt+V 一键录音，Enter 停止）",
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
