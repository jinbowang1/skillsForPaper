import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      external: [
        "@mariozechner/pi-ai",
        "@mariozechner/pi-coding-agent",
        "dotenv",
        "undici",
        "winston",
        "winston-daily-rotate-file",
        "chokidar",
      ],
    },
  },
  resolve: {
    conditions: ["node"],
    mainFields: ["module", "main"],
  },
});
