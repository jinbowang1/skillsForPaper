// ── Qwen3-ASR WebSocket Protocol Types ──
// Protocol reference: https://help.aliyun.com/zh/model-studio/qwen-real-time-speech-recognition

// Client → Server events

export interface SessionUpdateEvent {
  event_id: string;
  type: "session.update";
  session: {
    modalities: string[];
    input_audio_format: string;
    sample_rate: number;
    input_audio_transcription?: {
      language?: string;
    };
    turn_detection?: {
      type: string;
      threshold?: number;
      silence_duration_ms?: number;
    };
  };
}

export interface InputAudioBufferAppendEvent {
  event_id: string;
  type: "input_audio_buffer.append";
  audio: string; // base64-encoded PCM data
}

export interface SessionFinishEvent {
  event_id: string;
  type: "session.finish";
}

export type ClientEvent =
  | SessionUpdateEvent
  | InputAudioBufferAppendEvent
  | SessionFinishEvent;

// Server → Client events

export interface SessionCreatedEvent {
  type: "session.created";
  [key: string]: unknown;
}

export interface TranscriptionTextEvent {
  type: "conversation.item.input_audio_transcription.text";
  text: string;
  [key: string]: unknown;
}

export interface TranscriptionCompletedEvent {
  type: "conversation.item.input_audio_transcription.completed";
  transcript: string;
  [key: string]: unknown;
}

export interface SessionFinishedEvent {
  type: "session.finished";
  [key: string]: unknown;
}

export interface SpeechStartedEvent {
  type: "input_audio_buffer.speech_started";
  [key: string]: unknown;
}

export interface SpeechStoppedEvent {
  type: "input_audio_buffer.speech_stopped";
  [key: string]: unknown;
}

export interface ErrorEvent {
  type: "error";
  error: {
    code: string;
    message: string;
  };
}

export type ServerEvent =
  | SessionCreatedEvent
  | TranscriptionTextEvent
  | TranscriptionCompletedEvent
  | SessionFinishedEvent
  | SpeechStartedEvent
  | SpeechStoppedEvent
  | ErrorEvent;

// ── Configuration ──

export interface VoiceConfig {
  model: string;
  sampleRate: number;
  chunkSize: number;
  language: string;
  wsBaseUrl: string;
  timeoutMs: number;
  silenceDurationMs: number;
}

export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  model: "qwen3-asr-flash-realtime",
  sampleRate: 16000,
  chunkSize: 3200,
  language: "zh",
  wsBaseUrl: "wss://dashscope.aliyuncs.com/api-ws/v1/realtime",
  timeoutMs: 5 * 60 * 1000,
  silenceDurationMs: 400,
};
