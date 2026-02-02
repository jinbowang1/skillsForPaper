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

// Load .env early so all modules can read env vars
dotenv.config({ path: ENV_PATH });

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

let mainWindow: BrowserWindow | null = null;
let sessionBridge: SessionBridge | null = null;
let bookshelfWatcher: BookshelfWatcher | null = null;
let taskParser: TaskParser | null = null;
let voiceHandler: VoiceHandler | null = null;

nativeTheme.themeSource = "dark";

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#000000",
    titleBarStyle: "hidden",
    trafficLightPosition: { x: 20, y: 18 },
    vibrancy: "under-window",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

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
  bookshelfWatcher?.stop();
  taskParser?.stop();
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
