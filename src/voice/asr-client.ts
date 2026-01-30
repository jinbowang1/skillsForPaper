import { EventEmitter } from "events";
import WebSocket from "ws";
import type {
  VoiceConfig,
  ServerEvent,
  SessionUpdateEvent,
  InputAudioBufferAppendEvent,
  SessionFinishEvent,
} from "./types.js";

export interface AsrClientEvents {
  interim: (text: string) => void;
  completed: (text: string) => void;
  finished: () => void;
  error: (err: Error) => void;
  speechStarted: () => void;
  connected: () => void;
}

export declare interface AsrClient {
  on<K extends keyof AsrClientEvents>(
    event: K,
    listener: AsrClientEvents[K],
  ): this;
  emit<K extends keyof AsrClientEvents>(
    event: K,
    ...args: Parameters<AsrClientEvents[K]>
  ): boolean;
}

let eventSeq = 0;
function nextEventId(): string {
  return `evt_${Date.now()}_${++eventSeq}`;
}

export class AsrClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: VoiceConfig;
  private apiKey: string;
  private completedTexts: string[] = [];

  constructor(config: VoiceConfig, apiKey: string) {
    super();
    this.config = config;
    this.apiKey = apiKey;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `${this.config.wsBaseUrl}?model=${this.config.model}`;

      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.apiKey}`,
        "OpenAI-Beta": "realtime=v1",
      };

      this.ws = new WebSocket(wsUrl, { headers });

      this.ws.on("open", () => {
        this.sendSessionUpdate();
      });

      this.ws.on("message", (data: WebSocket.Data) => {
        try {
          const event = JSON.parse(data.toString()) as ServerEvent;
          this.handleServerEvent(event, resolve);
        } catch (err) {
          this.emit(
            "error",
            new Error(`Failed to parse server message: ${err}`),
          );
        }
      });

      this.ws.on("error", (err) => {
        this.emit("error", err instanceof Error ? err : new Error(String(err)));
        reject(err);
      });

      this.ws.on("close", (code, reason) => {
        if (code !== 1000) {
          this.emit(
            "error",
            new Error(
              `WebSocket closed unexpectedly: ${code} ${reason.toString()}`,
            ),
          );
        }
      });
    });
  }

  private sendSessionUpdate(): void {
    const event: SessionUpdateEvent = {
      event_id: nextEventId(),
      type: "session.update",
      session: {
        modalities: ["text"],
        input_audio_format: "pcm",
        sample_rate: this.config.sampleRate,
        input_audio_transcription: {
          language: this.config.language,
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.0,
          silence_duration_ms: this.config.silenceDurationMs,
        },
      },
    };
    this.send(event);
  }

  private handleServerEvent(
    event: ServerEvent,
    onConnected?: (value: void) => void,
  ): void {
    switch (event.type) {
      case "session.created":
        this.emit("connected");
        onConnected?.();
        break;

      case "conversation.item.input_audio_transcription.text":
        this.emit("interim", event.text);
        break;

      case "conversation.item.input_audio_transcription.completed":
        this.completedTexts.push(event.transcript);
        this.emit("completed", event.transcript);
        break;

      case "session.finished":
        this.emit("finished");
        break;

      case "input_audio_buffer.speech_started":
        this.emit("speechStarted");
        break;

      case "error":
        this.emit(
          "error",
          new Error(`ASR error [${event.error.code}]: ${event.error.message}`),
        );
        break;
    }
  }

  sendAudio(chunk: Buffer): void {
    const event: InputAudioBufferAppendEvent = {
      event_id: nextEventId(),
      type: "input_audio_buffer.append",
      audio: chunk.toString("base64"),
    };
    this.send(event);
  }

  finish(): Promise<string> {
    return new Promise((resolve, reject) => {
      const finishEvent: SessionFinishEvent = {
        event_id: nextEventId(),
        type: "session.finish",
      };

      const timeout = setTimeout(() => {
        reject(new Error("Timed out waiting for session.finished"));
      }, 10000);

      this.once("finished", () => {
        clearTimeout(timeout);
        resolve(this.getFullText());
        this.close();
      });

      this.once("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      this.send(finishEvent);
    });
  }

  getFullText(): string {
    return this.completedTexts.join("");
  }

  private send(event: object): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
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
