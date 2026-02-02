import { BrowserWindow } from "electron";
import dotenv from "dotenv";
import { AGENT_CWD, OUTPUT_DIR, ENV_PATH } from "./paths.js";
import { logger } from "./app-logger.js";
import { createResourceLoader } from "./app-resource-loader.js";
import { installGlobalBridge, setWindow as setDecisionWindow } from "./decision-bridge.js";
import type { BookshelfWatcher } from "./bookshelf-watcher.js";

export class SessionBridge {
  private window: BrowserWindow;
  private session: any = null;
  private modelRegistry: any = null;
  private isStreaming = false;
  private logger: any = logger;
  private bookshelfWatcher: BookshelfWatcher | null = null;

  constructor(window: BrowserWindow) {
    this.window = window;
  }

  setBookshelfWatcher(watcher: BookshelfWatcher) {
    this.bookshelfWatcher = watcher;
  }

  async initialize() {
    // Load .env
    dotenv.config({ path: ENV_PATH, override: true });

    // Dynamic import for ESM-only package
    const piAgent = await import("@mariozechner/pi-coding-agent");

    const {
      createAgentSession,
      SessionManager,
      SettingsManager,
      AuthStorage,
      ModelRegistry,
      codingTools,
      getAgentDir,
    } = piAgent;

    // Install decision bridge BEFORE creating session — the ask_user extension
    // reads global.__electronDecisionBridge during execute(), which happens
    // after session creation.
    installGlobalBridge();
    setDecisionWindow(this.window);

    const cwd = AGENT_CWD;
    const agentDir = getAgentDir();

    this.logger.info("=== Electron session initializing ===");
    this.logger.info(`cwd: ${cwd}`);

    // Auth
    const authStorage = new AuthStorage();
    const envKey = process.env.ANTHROPIC_API_KEY;
    if (envKey) {
      authStorage.setRuntimeApiKey("anthropic", envKey);
      this.logger.info("Using ANTHROPIC_API_KEY from environment");
    }

    // Model registry
    this.modelRegistry = new ModelRegistry(authStorage);

    // Register MiniMax
    const minimaxKey = process.env.MINIMAX_API_KEY;
    if (minimaxKey) {
      this.modelRegistry.registerProvider("minimax", {
        baseUrl: "https://api.minimaxi.com/anthropic",
        apiKey: minimaxKey,
        api: "anthropic-messages",
        authHeader: true,
        models: [
          {
            id: "MiniMax-M2.1",
            name: "MiniMax M2.1",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 1000000,
            maxTokens: 128000,
          },
        ],
      });
    }

    // Register DashScope (Qwen3)
    const dashscopeKey = process.env.DASHSCOPE_API_KEY;
    if (dashscopeKey) {
      this.modelRegistry.registerProvider("dashscope", {
        baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        apiKey: dashscopeKey,
        api: "openai-completions",
        authHeader: true,
        models: [
          {
            id: "qwen3-max",
            name: "Qwen3 Max",
            reasoning: true,
            input: ["text"],
            cost: { input: 1.2, output: 6.0, cacheRead: 0.24, cacheWrite: 1.2 },
            contextWindow: 262144,
            maxTokens: 65536,
          },
        ],
      });
    }

    // Register Moonshot (Kimi K2.5)
    const moonshotKey = process.env.MOONSHOT_API_KEY;
    if (moonshotKey) {
      this.modelRegistry.registerProvider("moonshot", {
        baseUrl: "https://api.moonshot.ai/v1",
        apiKey: moonshotKey,
        api: "openai-completions",
        authHeader: true,
        models: [
          {
            id: "kimi-k2.5",
            name: "Kimi K2.5",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0.6, output: 3.0, cacheRead: 0.1, cacheWrite: 0.6 },
            contextWindow: 262144,
            maxTokens: 65536,
          },
        ],
      });
    }

    // Settings & session
    const settingsManager = SettingsManager.create(cwd, agentDir);
    settingsManager.setQuietStartup(true);
    const sessionManager = SessionManager.create(cwd);

    // Resource loader (pass piAgent to avoid static require of ESM-only package)
    const resourceLoader = createResourceLoader(cwd, agentDir, piAgent);
    await resourceLoader.reload();

    // Create agent session (ask_user tool comes from .pi/extensions/ask-user.ts)
    const { session } = await createAgentSession({
      cwd,
      agentDir,
      authStorage,
      modelRegistry: this.modelRegistry,
      tools: codingTools,
      resourceLoader,
      sessionManager,
      settingsManager,
    });

    this.session = session;
    this.logger.info(`Electron session created: ${session.sessionId}`);

    // Log available models for debugging
    try {
      const allModels = this.modelRegistry.getAll();
      this.logger.info(`[models] Total registered: ${allModels.length}`);
      for (const m of allModels) {
        this.logger.info(`[models]   ${m.provider}/${m.id} → "${m.name}"`);
      }
      const filtered = this.getModels();
      this.logger.info(`[models] After filter: ${filtered.length}`);
      for (const m of filtered) {
        this.logger.info(`[models]   ✓ ${m.provider}/${m.id} → "${m.name}"`);
      }
    } catch {}

    this.logger.info(`[models] Current model: ${session.model?.provider}/${session.model?.id} → "${session.model?.name}"`);

    // Subscribe to all events and forward to renderer
    session.subscribe((event: any) => {
      this.handleSessionEvent(event);
    });

    // Notify renderer that session is ready (resolves race condition:
    // renderer loads before async init completes → model shows "unknown")
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send("agent:state-change", {
        isStreaming: false,
        state: "ready",
        model: this.session.model?.name || "unknown",
      });
    }
  }

  private handleSessionEvent(event: any) {
    if (!this.window || this.window.isDestroyed()) return;

    // Log ALL events for debugging
    if (event.type === "message_update" && event.assistantMessageEvent) {
      const ame = event.assistantMessageEvent;
      if (ame.type !== "text_delta" && ame.type !== "thinking_delta") {
        this.logger.info(`[event] message_update → ${ame.type}`);
      }
    } else if (event.type === "message_start" || event.type === "message_end") {
      // Log message content to diagnose empty responses
      const msg = event.message;
      const contentSummary = msg?.content
        ? JSON.stringify(msg.content).slice(0, 300)
        : "no-content";
      const stopReason = msg?.stop_reason || msg?.stopReason || "none";
      this.logger.info(`[event] ${event.type} stop=${stopReason} content=${contentSummary}`);
    } else if (event.type === "auto_retry_start" || event.type === "auto_retry_end") {
      this.logger.info(`[event] ${event.type} reason=${event.reason || "unknown"}`);
    } else {
      this.logger.info(`[event] ${event.type}`);
    }

    if (event.type === "agent_start") {
      this.isStreaming = true;
      this.window.webContents.send("agent:state-change", {
        isStreaming: true,
        state: "working",
        model: this.session?.model?.name || "unknown",
      });
    } else if (event.type === "agent_end") {
      this.isStreaming = false;
      this.window.webContents.send("agent:state-change", {
        isStreaming: false,
        state: "idle",
        model: this.session?.model?.name || "unknown",
      });
    }

    // Detect file writes to mark active file in bookshelf
    if (event.type === "tool_execution_end" && this.bookshelfWatcher) {
      const toolName = (event.toolName || "").toLowerCase();
      if (toolName === "write" || toolName === "edit") {
        const args = event.args || {};
        const filePath = args.file_path || args.path || "";
        if (filePath && filePath.startsWith(OUTPUT_DIR)) {
          this.bookshelfWatcher.setActiveFile(filePath);
        }
      }
    }

    this.window.webContents.send("agent:event", event);
  }

  async prompt(text: string, images?: string[]) {
    if (!this.session) throw new Error("Session not initialized");
    this.logger.info(`[prompt] Sending to model: ${this.session.model?.provider}/${this.session.model?.id} (${this.session.model?.name})`);
    try {
      await this.session.prompt(text);
      this.logger.info("[prompt] Completed successfully");
    } catch (err) {
      this.logger.error("[prompt] Error:", err);
      this.resetStreamingState();
      throw err;
    }
  }

  async steer(text: string) {
    if (!this.session) throw new Error("Session not initialized");
    try {
      await this.session.followUp(text);
    } catch (err) {
      this.logger.error("Steer error:", err);
      this.resetStreamingState();
      throw err;
    }
  }

  private resetStreamingState() {
    this.isStreaming = false;
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send("agent:state-change", {
        isStreaming: false,
        state: "error",
        model: this.session?.model?.name || "unknown",
      });
    }
  }

  async abort() {
    if (!this.session) return;
    await this.session.abort();
  }

  // Only expose the two models the user actually uses.
  // Use startsWith for anthropic because SDK may append a date suffix
  // (e.g. "claude-opus-4-5-20251101").
  private static ALLOWED_MODELS = [
    { provider: "anthropic", idPrefix: "claude-opus-4-5" },
    { provider: "minimax", idPrefix: "MiniMax-M2.1" },
    { provider: "dashscope", idPrefix: "qwen3-max" },
    { provider: "moonshot", idPrefix: "kimi-k2.5" },
  ];

  private static isAllowed(m: { provider: string; id: string }): boolean {
    return SessionBridge.ALLOWED_MODELS.some(
      (a) => a.provider === m.provider && m.id.startsWith(a.idPrefix)
    );
  }

  getModels(): Array<{ id: string; name: string; provider: string }> {
    if (!this.modelRegistry) return [];
    try {
      const all = this.modelRegistry.getAll();
      // Keep only one model per allowed entry (pick shortest id = the alias)
      const result: Array<{ id: string; name: string; provider: string }> = [];
      for (const rule of SessionBridge.ALLOWED_MODELS) {
        const candidates = all.filter(
          (m: any) => m.provider === rule.provider && m.id.startsWith(rule.idPrefix)
        );
        if (candidates.length > 0) {
          // Prefer the shortest id (alias like "claude-opus-4-5" over dated "claude-opus-4-5-20251101")
          candidates.sort((a: any, b: any) => a.id.length - b.id.length);
          const pick = candidates[0];
          result.push({ id: pick.id, name: pick.name, provider: pick.provider });
        }
      }
      return result;
    } catch {
      return [];
    }
  }

  async setModel(modelId: string) {
    if (!this.session) throw new Error("Session not initialized");

    // Find the model matching both id AND an allowed provider
    const allModels = this.modelRegistry.getAll();
    const target = allModels.find(
      (m: any) => m.id === modelId && SessionBridge.isAllowed(m)
    );
    if (!target) throw new Error(`Model not found: ${modelId}`);

    // SDK setModel expects the full model object
    await this.session.setModel(target);

    const modelName = this.session.model?.name || target.name || modelId;
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send("agent:state-change", {
        isStreaming: this.isStreaming,
        state: this.isStreaming ? "working" : "idle",
        model: modelName,
      });
    }
    return { model: modelName };
  }

  getState() {
    return {
      isStreaming: this.isStreaming,
      model: this.session?.model?.name || "unknown",
    };
  }

  getSession() {
    return this.session;
  }
}
