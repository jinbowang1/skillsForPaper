import { app, BrowserWindow, nativeTheme } from "electron";
import path from "path";
import dotenv from "dotenv";
import { ENV_PATH, IS_PACKAGED } from "./paths.js";
import { isFirstRun, bootstrapUserData } from "./first-run.js";
import { registerIpcHandlers } from "./ipc-handlers.js";
import { SessionBridge } from "./session-bridge.js";
import { BookshelfWatcher } from "./bookshelf-watcher.js";
import { TaskParser } from "./task-parser.js";
import { VoiceHandler } from "./voice-handler.js";
import { initAutoUpdater } from "./auto-updater.js";
import { initUsageTracker, stopUsageTracker } from "./usage-tracker.js";
import { initCrashReporter } from "./crash-reporter.js";
import { initFeatureAnalytics } from "./feature-analytics.js";
import { setupBundledToolsEnv, getBundledToolsInfo } from "./bundled-tools.js";
import { initChatHistory, flushChatHistory } from "./chat-history.js";

// Load .env early so all modules can read env vars
dotenv.config({ path: ENV_PATH });

// Setup bundled tools PATH (bash, python, sox) for packaged app
if (IS_PACKAGED) {
  setupBundledToolsEnv();
  console.log("[main] Bundled tools setup:\n" + getBundledToolsInfo());
}

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

let mainWindow: BrowserWindow | null = null;
let sessionBridge: SessionBridge | null = null;
let bookshelfWatcher: BookshelfWatcher | null = null;
let taskParser: TaskParser | null = null;
let voiceHandler: VoiceHandler | null = null;

nativeTheme.themeSource = "dark";

function createWindow() {
  const isMac = process.platform === "darwin";

  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#000000",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  };

  if (isMac) {
    windowOptions.titleBarStyle = "hidden";
    windowOptions.trafficLightPosition = { x: 20, y: 18 };
    windowOptions.vibrancy = "under-window";
  } else {
    windowOptions.frame = false;
    windowOptions.titleBarOverlay = {
      color: "#000000",
      symbolColor: "#ffffff",
      height: 40,
    };
  }

  mainWindow = new BrowserWindow(windowOptions);

  // Ensure window is visible and centered
  mainWindow.center();
  mainWindow.show();
  mainWindow.focus();

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  // Open DevTools in development
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools({ mode: "detach" });
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  return mainWindow;
}

app.whenReady().then(async () => {
  // Ensure writable directories and template files exist (idempotent)
  if (IS_PACKAGED) bootstrapUserData();

  const win = createWindow();

  // Create all components immediately so IPC handlers are available
  sessionBridge = new SessionBridge(win);
  bookshelfWatcher = new BookshelfWatcher(win);
  sessionBridge.setBookshelfWatcher(bookshelfWatcher);
  taskParser = new TaskParser(win);
  voiceHandler = new VoiceHandler(win);

  // Register IPC handlers BEFORE async init (renderer calls them on load)
  registerIpcHandlers(win, sessionBridge, bookshelfWatcher, taskParser, voiceHandler);

  // Start bookshelf watcher and task parser (sync, no delay)
  try {
    bookshelfWatcher.start();
  } catch (err) {
    console.error("[main] Failed to start bookshelf watcher:", err);
  }

  try {
    taskParser.start();
  } catch (err) {
    console.error("[main] Failed to start task parser:", err);
  }

  // Auto-updater (checks GitHub Releases for new versions)
  if (IS_PACKAGED) initAutoUpdater(win);

  // Usage tracking (token/cost reporting to WeChat webhook)
  initUsageTracker();

  // Crash reporter (local crash collection)
  initCrashReporter(win);

  // Feature analytics (track feature usage)
  initFeatureAnalytics();

  // Chat history persistence
  initChatHistory();

  // First run: show setup wizard instead of initializing session
  if (isFirstRun()) {
    win.webContents.once("did-finish-load", () => {
      win.webContents.send("setup:required");
    });
  } else {
    // Initialize session bridge last (async, takes time)
    try {
      await sessionBridge.initialize();
      console.log("[main] Session bridge initialized");
    } catch (err) {
      console.error("[main] Failed to initialize session bridge:", err);
    }
  }
});

app.on("window-all-closed", () => {
  flushChatHistory();
  stopUsageTracker();
  bookshelfWatcher?.stop();
  taskParser?.stop();
  app.quit();
});

app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    const win = createWindow();

    // Reinitialize all components with new window
    sessionBridge = new SessionBridge(win);
    bookshelfWatcher = new BookshelfWatcher(win);
    sessionBridge.setBookshelfWatcher(bookshelfWatcher);
    taskParser = new TaskParser(win);
    voiceHandler = new VoiceHandler(win);

    // Re-register IPC handlers for new window
    registerIpcHandlers(win, sessionBridge, bookshelfWatcher, taskParser, voiceHandler);

    // Restart watchers
    try {
      bookshelfWatcher.start();
    } catch (err) {
      console.error("[main] Failed to restart bookshelf watcher:", err);
    }

    try {
      taskParser.start();
    } catch (err) {
      console.error("[main] Failed to restart task parser:", err);
    }

    // Initialize session bridge
    if (!isFirstRun()) {
      try {
        await sessionBridge.initialize();
        console.log("[main] Session bridge reinitialized");
      } catch (err) {
        console.error("[main] Failed to reinitialize session bridge:", err);
      }
    }
  }
});
