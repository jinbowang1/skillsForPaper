declare module "node-record-lpcm16" {
  import { Readable } from "stream";

  interface RecordOptions {
    sampleRate?: number;
    channels?: number;
    compress?: boolean;
    threshold?: number;
    silence?: string;
    recorder?: string;
    endOnSilence?: boolean;
    audioType?: string;
    device?: string | null;
  }

  interface Recording {
    stream(): Readable;
    stop(): void;
    pause(): void;
    resume(): void;
  }

  export function record(options?: RecordOptions): Recording;
}
