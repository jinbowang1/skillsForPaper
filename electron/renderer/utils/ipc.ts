/**
 * Typed wrappers for IPC calls.
 * These are thin wrappers around window.api for convenience.
 */

export async function sendPrompt(text: string, images?: string[]) {
  return window.api.prompt(text, images);
}

export async function sendSteer(text: string) {
  return window.api.steer(text);
}

export async function abortSession() {
  return window.api.abort();
}

export async function respondDecision(toolCallId: string, answer: string) {
  return window.api.respondDecision(toolCallId, answer);
}

export async function openFile(path: string) {
  return window.api.openFile(path);
}

export async function revealFile(path: string) {
  return window.api.revealFile(path);
}
