import { BrowserWindow } from "electron";
import dotenv from "dotenv";
import { AGENT_CWD, OUTPUT_DIR, ENV_PATH } from "./paths.js";
import { logger } from "./app-logger.js";
import { createResourceLoader } from "./app-resource-loader.js";
import { installGlobalBridge, setWindow as setDecisionWindow } from "./decision-bridge.js";
import type { BookshelfWatcher } from "./bookshelf-watcher.js";
import { trackEvent } from "./usage-tracker.js";

// Tool execution timeout in milliseconds (5 minutes)
const TOOL_TIMEOUT_MS = 5 * 60 * 1000;

export class SessionBridge {
  private window: BrowserWindow;
  private session: any = null;
  private modelRegistry: any = null;
  private isStreaming = false;
  private logger: any = logger;
  private bookshelfWatcher: BookshelfWatcher | null = null;
  // Track active tool executions for timeout handling
  private activeToolTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(window: BrowserWindow) {
    this.window = window;
  }

  setBookshelfWatcher(watcher: BookshelfWatcher) {
    this.bookshelfWatcher = watcher;
  }

  async initialize() {
    // Load .env
    dotenv.config({ path: ENV_PATH, override: true });

    // Set up HTTP proxy BEFORE loading the SDK.
    // The SDK's stream.js does this asynchronously via import("undici").then(...)
    // which creates a race condition. We do it synchronously here to guarantee
    // the proxy is active before any requests are made.
    if (process.env.HTTPS_PROXY || process.env.HTTP_PROXY) {
      try {
        const { EnvHttpProxyAgent, setGlobalDispatcher } = await import("undici");
        setGlobalDispatcher(new EnvHttpProxyAgent());
        this.logger.info(`[proxy] Global proxy set: ${process.env.HTTPS_PROXY || process.env.HTTP_PROXY}`);
      } catch (err) {
        this.logger.warn(`[proxy] Failed to set proxy: ${err}`);
      }
    }

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
    // Pricing: $0.30/M input, $1.20/M output (Jan 2026)
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
            cost: { input: 0.3, output: 1.2, cacheRead: 0.3, cacheWrite: 0.3 },
            contextWindow: 1000000,
            maxTokens: 128000,
          },
        ],
      });
    }

    // Register DashScope (Qwen3)
    // DashScope's OpenAI-compatible API does not support several OpenAI-specific
    // params (store, stream_options, max_completion_tokens, developer role).
    // The compat object tells the SDK to skip those and use Qwen-native thinking.
    // Pricing (≤32K tier): ¥2.5/M input, ¥10/M output → ~$0.34/$1.38 (Jan 2026)
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
            cost: { input: 0.345, output: 1.38, cacheRead: 0.069, cacheWrite: 0.345 },
            contextWindow: 262144,
            maxTokens: 65536,
            compat: {
              supportsStore: false,
              supportsDeveloperRole: false,
              supportsUsageInStreaming: false,
              thinkingFormat: "qwen",
            },
          },
        ],
      });
    }

    // Register Moonshot (Kimi K2.5)
    // Note: api.moonshot.cn (not .ai) — the .ai domain rejects keys from the CN platform
    // Pricing: ¥4/M input, ¥16/M output → $0.60/$2.50; cache read $0.15/M (Jan 2026)
    const moonshotKey = process.env.MOONSHOT_API_KEY;
    if (moonshotKey) {
      this.modelRegistry.registerProvider("moonshot", {
        baseUrl: "https://api.moonshot.cn/v1",
        apiKey: moonshotKey,
        api: "openai-completions",
        authHeader: true,
        models: [
          {
            id: "kimi-k2.5",
            name: "Kimi K2.5",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0.6, output: 2.5, cacheRead: 0.15, cacheWrite: 0.6 },
            contextWindow: 262144,
            maxTokens: 65536,
            compat: {
              supportsStore: false,
              supportsDeveloperRole: false,
              supportsUsageInStreaming: false,
            },
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

    // Default to MiniMax for mainland China users (no VPN needed)
    try {
      const minimaxModel = this.modelRegistry.getAll().find(
        (m: any) => m.provider === "minimax" && m.id.startsWith("MiniMax-M2.1")
      );
      if (minimaxModel) {
        await session.setModel(minimaxModel);
        this.logger.info(`[models] Default model set to minimax/${minimaxModel.id}`);
      }
    } catch (err) {
      this.logger.warn(`[models] Failed to set default model: ${err}`);
    }

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
      this.isStreaming = false;
      this.window.webContents.send("agent:state-change", this.buildStatePayload("ready"));
    }
  }

  private buildStatePayload(state: string) {
    return {
      isStreaming: this.isStreaming,
      state,
      model: this.session?.model?.name || "unknown",
      supportsImages: this.session?.model ? SessionBridge.modelSupportsImages(this.session.model) : false,
    };
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
      this.window.webContents.send("agent:state-change", this.buildStatePayload("working"));
    } else if (event.type === "agent_end") {
      this.isStreaming = false;
      this.clearAllToolTimers();
      this.window.webContents.send("agent:state-change", this.buildStatePayload("idle"));
    }

    // Tool execution timeout handling
    if (event.type === "tool_execution_start") {
      const toolCallId = event.toolCallId || event.id || `tool-${Date.now()}`;
      const toolName = event.toolName || "unknown";
      this.logger.info(`[timeout] Tool started: ${toolName} (${toolCallId})`);

      // Clear any existing timer for this tool
      if (this.activeToolTimers.has(toolCallId)) {
        clearTimeout(this.activeToolTimers.get(toolCallId));
      }

      // Set timeout timer
      const timer = setTimeout(async () => {
        this.logger.warn(`[timeout] Tool ${toolName} (${toolCallId}) exceeded ${TOOL_TIMEOUT_MS / 1000}s`);
        this.activeToolTimers.delete(toolCallId);

        // Notify user about the timeout
        if (this.window && !this.window.isDestroyed()) {
          this.window.webContents.send("agent:event", {
            type: "tool_timeout",
            toolName,
            toolCallId,
            message: `工具 ${toolName} 执行超时，正在尝试其他方法...`,
          });
        }

        // Abort current operation and tell agent to try another approach
        await this.abortAndRetry(toolName);
      }, TOOL_TIMEOUT_MS);

      this.activeToolTimers.set(toolCallId, timer);
    }

    if (event.type === "tool_execution_end") {
      const toolCallId = event.toolCallId || event.id;
      if (toolCallId && this.activeToolTimers.has(toolCallId)) {
        clearTimeout(this.activeToolTimers.get(toolCallId));
        this.activeToolTimers.delete(toolCallId);
        this.logger.info(`[timeout] Tool completed: ${event.toolName || "unknown"} (${toolCallId})`);
      }

      // Detect file writes to mark active file in bookshelf
      if (this.bookshelfWatcher) {
        const toolName = (event.toolName || "").toLowerCase();
        if (toolName === "write" || toolName === "edit") {
          const args = event.args || {};
          const filePath = args.file_path || args.path || "";
          if (filePath && filePath.startsWith(OUTPUT_DIR)) {
            this.bookshelfWatcher.setActiveFile(filePath);
          }
        }
      }
    }

    // Track token usage for reporting
    trackEvent(event);

    this.window.webContents.send("agent:event", event);
  }

  async prompt(text: string, images?: Array<{ data: string; mimeType: string }>) {
    if (!this.session) throw new Error("Session not initialized");
    this.logger.info(`[prompt] Sending to model: ${this.session.model?.provider}/${this.session.model?.id} (${this.session.model?.name})`);
    try {
      if (images && images.length > 0) {
        const imageContents = images.map((img) => ({
          type: "image" as const,
          data: img.data,
          mimeType: img.mimeType,
        }));
        this.logger.info(`[prompt] With ${imageContents.length} image(s)`);
        await this.session.prompt(text, { images: imageContents });
      } else {
        await this.session.prompt(text);
      }
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
    this.clearAllToolTimers();
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send("agent:state-change", this.buildStatePayload("error"));
    }
  }

  private clearAllToolTimers() {
    if (this.activeToolTimers.size > 0) {
      this.logger.info(`[timeout] Clearing ${this.activeToolTimers.size} active tool timer(s)`);
      for (const timer of this.activeToolTimers.values()) {
        clearTimeout(timer);
      }
      this.activeToolTimers.clear();
    }
  }

  async abort() {
    if (!this.session) return;
    this.logger.info("[abort] User requested abort");
    // Clear all tool timers first
    this.clearAllToolTimers();
    try {
      await this.session.abort();
      this.logger.info("[abort] Session abort completed");
    } catch (err) {
      this.logger.error("[abort] Error:", err);
    }
    // Force reset streaming state in case agent_end event doesn't fire
    if (this.isStreaming) {
      this.isStreaming = false;
      if (this.window && !this.window.isDestroyed()) {
        this.window.webContents.send("agent:state-change", this.buildStatePayload("idle"));
      }
      this.logger.info("[abort] Force reset streaming state to idle");
    }
  }

  /**
   * Abort current operation due to tool timeout and ask agent to try another approach.
   */
  private async abortAndRetry(toolName: string) {
    if (!this.session) return;
    this.logger.info(`[timeout] Aborting due to tool timeout: ${toolName}`);

    // Clear all tool timers
    this.clearAllToolTimers();

    try {
      // Abort the current operation
      await this.session.abort();
      this.logger.info("[timeout] Session aborted, sending retry message");

      // Wait a moment for the session to settle
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Send a follow-up message to the agent explaining what happened
      const retryMessage = `刚才的工具 "${toolName}" 执行超时了（超过5分钟还没完成）。请尝试其他方法来完成任务，比如：
- 如果是在执行复杂的命令，可以拆分成更小的步骤
- 如果是在等待网络请求，可以检查网络或换一个方法
- 如果是在处理大文件，可以分块处理
请继续完成之前的任务。`;

      await this.session.followUp(retryMessage);
      this.logger.info("[timeout] Retry message sent to agent");

    } catch (err) {
      this.logger.error("[timeout] Error during abort and retry:", err);
      // Reset streaming state as fallback
      this.isStreaming = false;
      if (this.window && !this.window.isDestroyed()) {
        this.window.webContents.send("agent:state-change", this.buildStatePayload("idle"));
      }
    }
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

  private static modelSupportsImages(m: any): boolean {
    // Explicit input array from registration
    if (Array.isArray(m.input) && m.input.includes("image")) return true;
    // Anthropic models (Claude) always support vision
    if (m.provider === "anthropic") return true;
    return false;
  }

  getModels(): Array<{ id: string; name: string; provider: string; needsVpn: boolean; supportsImages: boolean }> {
    if (!this.modelRegistry) return [];
    try {
      const all = this.modelRegistry.getAll();
      // Keep only one model per allowed entry (pick shortest id = the alias)
      const result: Array<{ id: string; name: string; provider: string; needsVpn: boolean; supportsImages: boolean }> = [];
      for (const rule of SessionBridge.ALLOWED_MODELS) {
        const candidates = all.filter(
          (m: any) => m.provider === rule.provider && m.id.startsWith(rule.idPrefix)
        );
        if (candidates.length > 0) {
          // Prefer the shortest id (alias like "claude-opus-4-5" over dated "claude-opus-4-5-20251101")
          candidates.sort((a: any, b: any) => a.id.length - b.id.length);
          const pick = candidates[0];
          result.push({
            id: pick.id,
            name: pick.name,
            provider: pick.provider,
            needsVpn: pick.provider === "anthropic",
            supportsImages: SessionBridge.modelSupportsImages(pick),
          });
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
      this.window.webContents.send("agent:state-change", this.buildStatePayload(this.isStreaming ? "working" : "idle"));
    }
    return { model: modelName };
  }

  getState() {
    return {
      isStreaming: this.isStreaming,
      model: this.session?.model?.name || "unknown",
      supportsImages: this.session?.model ? SessionBridge.modelSupportsImages(this.session.model) : false,
    };
  }

  getSession() {
    return this.session;
  }
}
