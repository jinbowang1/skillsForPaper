import { BrowserWindow } from "electron";
import path from "path";

const PROJECT_ROOT = path.resolve(__dirname, "../../..");

export class SessionBridge {
  private window: BrowserWindow;
  private session: any = null;
  private modelRegistry: any = null;
  private isStreaming = false;
  private logger: any = console;

  constructor(window: BrowserWindow) {
    this.window = window;
  }

  async initialize() {
    // Load .env
    const dotenv = await import("dotenv");
    dotenv.config({ path: path.join(PROJECT_ROOT, ".env") });

    // Dynamic import for ESM-only packages
    const [piAgent, parentConfig, parentLogger, parentResourceLoader] = await Promise.all([
      import("@mariozechner/pi-coding-agent"),
      import(path.join(PROJECT_ROOT, "dist", "config.js")),
      import(path.join(PROJECT_ROOT, "dist", "logger.js")),
      import(path.join(PROJECT_ROOT, "dist", "resource-loader.js")),
    ]);

    const {
      createAgentSession,
      SessionManager,
      SettingsManager,
      AuthStorage,
      ModelRegistry,
      codingTools,
      getAgentDir,
    } = piAgent;

    const { ROOT_DIR } = parentConfig;
    this.logger = parentLogger.logger;
    const { createResourceLoader } = parentResourceLoader;

    const cwd = ROOT_DIR;
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

    // Settings & session
    const settingsManager = SettingsManager.create(cwd, agentDir);
    settingsManager.setQuietStartup(true);
    const sessionManager = SessionManager.create(cwd);

    // Resource loader
    const resourceLoader = createResourceLoader(cwd, agentDir);
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
