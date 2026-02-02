import { BrowserWindow } from "electron";
import path from "path";
import { readFileSync, existsSync, watchFile, unwatchFile } from "fs";
import { OUTPUT_DIR } from "./paths.js";

const TASK_FILE = path.join(OUTPUT_DIR, "TASK.md");

export interface TaskStep {
  label: string;
  status: "done" | "current" | "pending";
}

export interface TaskState {
  title: string;
  steps: TaskStep[];
  isComplete: boolean;
}

export class TaskParser {
  private window: BrowserWindow;
  private state: TaskState | null = null;
  private watching = false;

  constructor(window: BrowserWindow) {
    this.window = window;
  }

  start() {
    this.parse();

    if (existsSync(TASK_FILE)) {
      watchFile(TASK_FILE, { interval: 1000 }, () => {
        this.parse();
        this.notifyRenderer();
      });
      this.watching = true;
    }

    // Periodically check if file appeared
    const checkInterval = setInterval(() => {
      if (!this.watching && existsSync(TASK_FILE)) {
        watchFile(TASK_FILE, { interval: 1000 }, () => {
          this.parse();
          this.notifyRenderer();
        });
        this.watching = true;
        this.parse();
        this.notifyRenderer();
      }
    }, 3000);

    // Store interval for cleanup
    (this as any)._checkInterval = checkInterval;
  }

  stop() {
    if (this.watching) {
      unwatchFile(TASK_FILE);
      this.watching = false;
    }
    const interval = (this as any)._checkInterval;
    if (interval) clearInterval(interval);
  }

  private parse() {
    if (!existsSync(TASK_FILE)) {
      this.state = null;
      return;
    }

    try {
      const content = readFileSync(TASK_FILE, "utf-8");

      // Extract title
      const titleMatch = content.match(/^#\s+当前任务：(.+)$/m);
      const title = titleMatch?.[1]?.trim() || "任务进行中";

      // Extract steps
      const stepRegex = /- \[([ xX])\]\s+(.+)/g;
      const steps: TaskStep[] = [];
      let match: RegExpExecArray | null;
      let foundCurrent = false;

      while ((match = stepRegex.exec(content)) !== null) {
        const checked = match[1].toLowerCase() === "x";
        let status: TaskStep["status"];

        if (checked) {
          status = "done";
        } else if (!foundCurrent) {
          status = "current";
          foundCurrent = true;
        } else {
          status = "pending";
        }

        steps.push({
          label: match[2].trim(),
          status,
        });
      }

      const isComplete = content.includes("## 状态：已完成");

      this.state = { title, steps, isComplete };
    } catch {
      this.state = null;
    }
  }

  private notifyRenderer() {
    if (this.window && !this.window.isDestroyed() && this.state) {
      this.window.webContents.send("task:update", this.state);
    }
  }

  getState(): TaskState | null {
    return this.state;
  }
}
