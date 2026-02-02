/**
 * Decision Bridge — connects the ask_user pi-agent extension to Electron's renderer.
 *
 * Flow:
 *   ask_user extension → global.__electronDecisionBridge.request(...)
 *       ↓ IPC "decision:request" to renderer (shows DecisionCard)
 *   User clicks option → IPC "decision:respond"
 *       ↓ resolves the pending promise → ask_user extension returns answer
 */
import type { BrowserWindow } from "electron";

interface PendingDecision {
  resolve: (answer: string) => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

// 5 minutes timeout for user decisions
const DECISION_TIMEOUT_MS = 5 * 60 * 1000;

const pending = new Map<string, PendingDecision>();
let win: BrowserWindow | null = null;

export function setWindow(w: BrowserWindow) {
  win = w;
}

/**
 * Called from the ask_user extension (via global bridge).
 * Sends decision:request IPC to renderer and returns a Promise that
 * resolves when the user clicks an option.
 */
export function requestDecision(
  toolCallId: string,
  question: string,
  options: Array<{ label: string; description?: string }>
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(toolCallId);
      reject(new Error("Decision timed out"));
    }, DECISION_TIMEOUT_MS);

    pending.set(toolCallId, { resolve, reject, timer });

    if (win && !win.isDestroyed()) {
      win.webContents.send("decision:request", { toolCallId, question, options });
    } else {
      clearTimeout(timer);
      pending.delete(toolCallId);
      reject(new Error("No window available"));
    }
  });
}

/**
 * Called from IPC handler when user responds.
 */
export function respondDecision(toolCallId: string, answer: string): boolean {
  const entry = pending.get(toolCallId);
  if (!entry) return false;
  clearTimeout(entry.timer);
  pending.delete(toolCallId);
  entry.resolve(answer);
  return true;
}

/**
 * Cancel a pending decision (e.g. when the agent is aborted).
 */
export function cancelDecision(toolCallId: string): boolean {
  const entry = pending.get(toolCallId);
  if (!entry) return false;
  clearTimeout(entry.timer);
  pending.delete(toolCallId);
  entry.reject(new Error("aborted"));
  return true;
}

/**
 * Install the bridge on the Node.js global so the ask_user extension can find it.
 */
export function installGlobalBridge() {
  (global as any).__electronDecisionBridge = {
    request: requestDecision,
    respond: respondDecision,
    cancel: cancelDecision,
  };
}
