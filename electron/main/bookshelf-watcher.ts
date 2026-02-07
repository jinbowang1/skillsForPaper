import { BrowserWindow } from "electron";
import path from "path";
import { readdirSync, statSync, existsSync } from "fs";
import { watch, type FSWatcher } from "chokidar";
import { getOutputDir } from "./settings.js";

export interface BookshelfItem {
  name: string;
  path: string;
  ext: string;
  size: number;
  mtime: number;
  category: "paper" | "experiment" | "reference" | "draft";
  isActive?: boolean;
}

// ── 忽略规则 ──

// LaTeX / build intermediates to ignore
const IGNORED_EXTS = new Set([
  // LaTeX build intermediates
  ".aux", ".log", ".blg", ".out", ".toc", ".bbl",
  ".synctex.gz", ".fls", ".fdb_latexmk", ".nav",
  ".snm", ".vrb", ".xdv",
  // Temporary files
  ".bak", ".tmp", ".temp", ".swp",
  // Compiled files
  ".pyc", ".pyo", ".class", ".o", ".obj",
  // Lock files
  ".lock", ".lockb",
  // OS generated
  ".DS_Store",
]);

const IGNORED_FILES = new Set([
  "missfont.log",
  ".DS_Store",
  "Thumbs.db",
  "desktop.ini",
]);

// Patterns for temp/intermediate filenames to skip
const IGNORED_NAME_PATTERNS = [
  /^temp[_-]/i,
  /^test[_-]/i,
  /[_-]backup\./i,
  /^~\$/,           // Word lock files
  /^__.*__$/,       // Dunder files
  /^\./,            // Hidden files
];

// Directories to skip entirely
const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".svn",
  "__pycache__",
  ".venv",
  "venv",
  ".idea",
  ".vscode",
  "dist",
  "build",
]);

// ── 分类规则 ──

// 资料类关键词（优先级最高）
const REFERENCE_KEYWORDS = [
  "review", "survey", "note", "reference", "literature",
  "参考", "笔记", "调研", "综述", "文献",
];

// 实验类扩展名
const EXPERIMENT_EXTS = new Set([
  ".py", ".ipynb", ".r", ".m", ".jl",           // 代码
  ".csv", ".xlsx", ".xls", ".json", ".yaml",    // 数据
  ".png", ".jpg", ".jpeg", ".svg", ".gif",      // 图表
  ".pkl", ".npy", ".pt", ".pth", ".h5",         // 模型/数据
]);

// 论文类扩展名
const PAPER_EXTS = new Set([
  ".tex", ".md", ".docx", ".doc", ".pdf",       // 文档
  ".txt", ".rtf",                               // 纯文本/富文本
  ".bib", ".cls", ".sty",                       // LaTeX 相关
  ".pptx", ".ppt",                              // 演示文稿
]);

function shouldIgnore(name: string, ext: string): boolean {
  if (IGNORED_FILES.has(name)) return true;
  if (IGNORED_EXTS.has(ext)) return true;
  // Handle compound extensions like .synctex.gz
  if (name.endsWith(".synctex.gz")) return true;
  // Check name patterns
  if (IGNORED_NAME_PATTERNS.some((re) => re.test(name))) return true;
  return false;
}

function categorizeFile(name: string, ext: string): BookshelfItem["category"] {
  const lower = name.toLowerCase();

  // 1. 资料类优先：文件名包含关键词
  if (REFERENCE_KEYWORDS.some((kw) => lower.includes(kw))) {
    return "reference";
  }

  // 2. 实验类：代码、数据、图表
  if (EXPERIMENT_EXTS.has(ext)) {
    return "experiment";
  }

  // 3. 论文类：文档、LaTeX
  if (PAPER_EXTS.has(ext)) {
    return "paper";
  }

  // 4. 未识别的文件归到草稿
  return "draft";
}

export class BookshelfWatcher {
  private window: BrowserWindow;
  private watcher: FSWatcher | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private items: BookshelfItem[] = [];
  private activeFilePath: string | null = null;

  constructor(window: BrowserWindow) {
    this.window = window;
  }

  start() {
    const outputDir = getOutputDir();
    if (!existsSync(outputDir)) return;

    this.scan();

    this.watcher = watch(outputDir, {
      ignoreInitial: true,
      depth: 2,
      ignored: /(^|[\/\\])\..|TASK\.md$/,
    });

    this.watcher.on("all", () => {
      this.debouncedScan();
    });
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  private debouncedScan() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.scan();
      this.notifyRenderer();
    }, 500);
  }

  private scan() {
    const outputDir = getOutputDir();
    if (!existsSync(outputDir)) {
      this.items = [];
      return;
    }

    try {
      const result: BookshelfItem[] = [];
      this.scanDir(outputDir, result, 0);
      this.items = result;
      // Apply active state
      for (const item of this.items) {
        item.isActive = item.path === this.activeFilePath;
      }
      // Sort: active first, then by modification time (newest first)
      this.items.sort((a, b) => {
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        return b.mtime - a.mtime;
      });
    } catch {
      this.items = [];
    }
  }

  /**
   * Recursively scan up to MAX_DEPTH levels.
   * MAX_DEPTH=2 means: output/ (0) -> project/ (1) -> subfolder/ (2)
   * This covers typical research project structures without scanning too deep.
   */
  private scanDir(dir: string, out: BookshelfItem[], depth: number) {
    const MAX_DEPTH = 2;
    if (depth > MAX_DEPTH) return;

    const entries = readdirSync(dir);
    for (const name of entries) {
      if (name.startsWith(".") || name === "TASK.md") continue;
      const fullPath = path.join(dir, name);
      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          if (IGNORED_DIRS.has(name)) continue;
          this.scanDir(fullPath, out, depth + 1);
          continue;
        }
        const ext = path.extname(name).toLowerCase();
        if (shouldIgnore(name, ext)) continue;
        out.push({
          name,
          path: fullPath,
          ext,
          size: stat.size,
          mtime: stat.mtimeMs,
          category: categorizeFile(name, ext),
        });
      } catch {
        // skip unreadable entries
      }
    }
  }

  private notifyRenderer() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send("bookshelf:update", this.items);
    }
  }

  /** Mark a file as the current focus — sorts it to the top and notifies renderer. */
  setActiveFile(filePath: string) {
    this.activeFilePath = filePath;
    // Re-scan to pick up newly created/modified file and apply active state
    this.scan();
    this.notifyRenderer();
  }

  clearActiveFile() {
    if (this.activeFilePath) {
      this.activeFilePath = null;
      for (const item of this.items) {
        item.isActive = false;
      }
      this.notifyRenderer();
    }
  }

  getItems(): BookshelfItem[] {
    return this.items;
  }
}
