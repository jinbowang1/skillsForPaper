import { BrowserWindow } from "electron";
import path from "path";
import { readdirSync, statSync, existsSync } from "fs";
import { watch, type FSWatcher } from "chokidar";

const PROJECT_ROOT = path.resolve(__dirname, "../../..");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "output");

export interface BookshelfItem {
  name: string;
  path: string;
  ext: string;
  size: number;
  mtime: number;
  category: "paper" | "experiment" | "research" | "draft" | "other";
  isActive?: boolean;
}

// LaTeX / build intermediates to ignore
const IGNORED_EXTS = new Set([
  ".aux", ".log", ".blg", ".out", ".toc", ".bbl",
  ".synctex.gz", ".fls", ".fdb_latexmk", ".nav",
  ".snm", ".vrb", ".xdv",
  ".bak", ".tmp", ".temp", ".swp",
]);
const IGNORED_FILES = new Set([
  "missfont.log", "hello_world.py",
]);
// Patterns for temp/intermediate filenames to skip
const IGNORED_NAME_PATTERNS = [
  /^temp[_-]/i,
  /^test[_-]/i,
  /[_-]backup\./i,
  /^~\$/,           // Word lock files
  /^__.*__$/,       // Dunder files
];

const PAPER_EXTS = new Set([".tex", ".md", ".docx", ".bib", ".pdf"]);
const EXPERIMENT_EXTS = new Set([".py", ".json", ".csv", ".png", ".jpg", ".svg"]);
const RESEARCH_KEYWORDS = ["review", "plan", "design", "survey", "analysis"];

// Match chapter drafts: chapter1.md, chapter_2.md, chapter-03.md, etc.
const CHAPTER_PATTERN = /^chapter[\s_-]?\d/i;

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
  const base = name.replace(/\.[^.]+$/, "");

  // Chapter drafts get their own category
  if (CHAPTER_PATTERN.test(base) && (ext === ".md" || ext === ".tex")) {
    return "draft";
  }

  // Check research keywords first (higher priority)
  if (
    RESEARCH_KEYWORDS.some((kw) => lower.includes(kw)) &&
    (ext === ".md" || ext === ".tex" || ext === ".pdf")
  ) {
    return "research";
  }

  if (PAPER_EXTS.has(ext)) return "paper";
  if (EXPERIMENT_EXTS.has(ext)) return "experiment";
  return "other";
}

export class BookshelfWatcher {
  private window: BrowserWindow;
  private watcher: FSWatcher | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private items: BookshelfItem[] = [];

  constructor(window: BrowserWindow) {
    this.window = window;
  }

  start() {
    if (!existsSync(OUTPUT_DIR)) return;

    this.scan();

    this.watcher = watch(OUTPUT_DIR, {
      ignoreInitial: true,
      depth: 1,
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
    if (!existsSync(OUTPUT_DIR)) {
      this.items = [];
      return;
    }

    try {
      const entries = readdirSync(OUTPUT_DIR);
      this.items = entries
        .filter((name) => !name.startsWith(".") && name !== "TASK.md")
        .map((name) => {
          const fullPath = path.join(OUTPUT_DIR, name);
          try {
            const stat = statSync(fullPath);
            if (!stat.isFile()) return null;
            const ext = path.extname(name).toLowerCase();
            if (shouldIgnore(name, ext)) return null;
            return {
              name,
              path: fullPath,
              ext,
              size: stat.size,
              mtime: stat.mtimeMs,
              category: categorizeFile(name, ext),
            } as BookshelfItem;
          } catch {
            return null;
          }
        })
        .filter(Boolean) as BookshelfItem[];

      // Sort by modification time (newest first)
      this.items.sort((a, b) => b.mtime - a.mtime);
    } catch {
      this.items = [];
    }
  }

  private notifyRenderer() {
    if (this.window && !this.window.isDestroyed()) {
      this.window.webContents.send("bookshelf:update", this.items);
    }
  }

  getItems(): BookshelfItem[] {
    return this.items;
  }
}
