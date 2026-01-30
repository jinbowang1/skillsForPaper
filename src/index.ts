#!/usr/bin/env node
import "dotenv/config";
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

// Set up global proxy for Node.js fetch (undici)
const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
if (proxyUrl) {
  setGlobalDispatcher(new ProxyAgent(proxyUrl));
  logger.info(`Using proxy: ${proxyUrl}`);
}

async function main() {
  const cwd = process.cwd();
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

  // Settings & session
  const settingsManager = SettingsManager.create(cwd, agentDir);
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
