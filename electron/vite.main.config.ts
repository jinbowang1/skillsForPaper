import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      // Packages with native bindings (.node files) must be external
      // They will be copied to resources and loaded at runtime
      external: [
        // @mariozechner packages with native bindings
        "@mariozechner/pi-ai",
        "@mariozechner/pi-coding-agent",
        "@mariozechner/pi-agent-core",
        "@mariozechner/pi-tui",
        "@mariozechner/clipboard",
        "@mariozechner/jiti",
        // Image processing with native bindings
        "@silvia-odwyer/photon-node",
        // fsevents is macOS only, optional for chokidar
        "fsevents",
        // ws optional native dependencies
        "bufferutil",
        "utf-8-validate",
        // Audio recording with native bindings
        "node-record-lpcm16",
      ],
    },
  },
  resolve: {
    conditions: ["node"],
    mainFields: ["module", "main"],
  },
});
