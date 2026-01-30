#!/usr/bin/env node
import { ROOT_DIR } from "./config.js"; // config.ts loads .env from project root
import { ProxyAgent, setGlobalDispatcher } from "undici";
import {
  createAgentSession,
  SessionManager,
  SettingsManager,
  AuthStorage,
  ModelRegistry,
  InteractiveMode,
  getAgentDir,
  codingTools,
} from "@mariozechner/pi-coding-agent";
import { createResourceLoader } from "./resource-loader.js";
import { logger } from "./logger.js";
import { loadMemory } from "./config.js";

function printWelcome() {
  const memory = loadMemory();
  const nameMatch = memory.match(/姓名：(.+)$/m);
  const name = nameMatch?.[1]?.trim() || "";
  const greeting = name ? `${name}，` : "";

  console.log();
  console.log(`  ${greeting}大师兄在。有活儿直接说。`);
  console.log(`  输入 /skills 看看我都会啥。`);
  console.log();
}

// Set up global proxy for Node.js fetch (undici)
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
if (proxyUrl) {
  setGlobalDispatcher(new ProxyAgent(proxyUrl));
  logger.info(`Using proxy: ${proxyUrl}`);
}

async function main() {
  // Always work from project root so files land in the right place
  const cwd = ROOT_DIR;
  const agentDir = getAgentDir();

  logger.info("=== skillsForPaper starting ===");
  logger.info(`cwd: ${cwd}`);
  logger.info(`agentDir: ${agentDir}`);

  // Auth: use existing pi auth storage (shares credentials with pi CLI)
  const authStorage = new AuthStorage();

  // Check ANTHROPIC_API_KEY from .env as fallback
  const envKey = process.env.ANTHROPIC_API_KEY;
  if (envKey) {
    authStorage.setRuntimeApiKey("anthropic", envKey);
    logger.info("Using ANTHROPIC_API_KEY from environment");
  }

  // Model registry
  const modelRegistry = new ModelRegistry(authStorage);

  // Register MiniMax as custom provider (Anthropic-compatible API)
  const minimaxKey = process.env.MINIMAX_API_KEY;
  if (minimaxKey) {
    modelRegistry.registerProvider("minimax", {
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
    logger.info("MiniMax M2.1 provider registered");
  }

  // Settings & session
  const settingsManager = SettingsManager.create(cwd, agentDir);
  settingsManager.setQuietStartup(true); // Don't show 150+ skill paths on startup
  const sessionManager = SessionManager.create(cwd);

  // Resource loader with multi-directory skill loading + system prompt
  const resourceLoader = createResourceLoader(cwd, agentDir);
  await resourceLoader.reload();

  // Log loaded skills
  const { skills } = resourceLoader.getSkills();
  logger.info(
    `Loaded ${skills.length} skills: ${skills.map((s) => s.name).join(", ")}`
  );

  // Create agent session
  const { session, modelFallbackMessage } = await createAgentSession({
    cwd,
    agentDir,
    authStorage,
    modelRegistry,
    tools: codingTools,
    resourceLoader,
    sessionManager,
    settingsManager,
  });

  logger.info(`Session created: ${session.sessionId}`);

  // Print static welcome (no API call)
  printWelcome();

  // Run interactive TUI
  const interactive = new InteractiveMode(session, {
    modelFallbackMessage,
  });
  await interactive.run();

  logger.info("=== skillsForPaper exiting ===");
}

main().catch((err) => {
  logger.error(`Fatal: ${err}`);
  console.error(err);
  process.exit(1);
});
