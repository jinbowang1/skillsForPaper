import { contextBridge, ipcRenderer } from "electron";

export type AgentEventCallback = (event: any) => void;
export type StateChangeCallback = (state: { isStreaming: boolean; state: string }) => void;
export type BookshelfUpdateCallback = (items: any[]) => void;
export type TaskUpdateCallback = (task: any) => void;
export type DecisionRequestCallback = (req: {
  toolCallId: string;
  question: string;
  options: Array<{ label: string; description?: string }>;
}) => void;

const api = {
  // ── Session ──
  prompt: (text: string, images?: string[]) =>
    ipcRenderer.invoke("session:prompt", { text, images }),

  steer: (text: string) => ipcRenderer.invoke("session:steer", { text }),

  abort: () => ipcRenderer.invoke("session:abort"),

  getState: () => ipcRenderer.invoke("session:getState"),

  getModels: () => ipcRenderer.invoke("model:list"),

  setModel: (modelId: string) => ipcRenderer.invoke("model:set", { modelId }),

  // ── Decision ──
  respondDecision: (toolCallId: string, answer: string) =>
    ipcRenderer.invoke("decision:respond", { toolCallId, answer }),

  // ── File ──
  openFile: (path: string) => ipcRenderer.invoke("file:open", { path }),

  revealFile: (path: string) => ipcRenderer.invoke("file:reveal", { path }),

  // ── Bookshelf ──
  getBookshelfItems: () => ipcRenderer.invoke("bookshelf:getItems"),

  // ── Task ──
  getTaskState: () => ipcRenderer.invoke("task:getState"),

  // ── Event listeners ──
  onAgentEvent: (callback: AgentEventCallback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data);
    ipcRenderer.on("agent:event", handler);
    return () => ipcRenderer.removeListener("agent:event", handler);
  },

  onStateChange: (callback: StateChangeCallback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data);
    ipcRenderer.on("agent:state-change", handler);
    return () => ipcRenderer.removeListener("agent:state-change", handler);
  },

  onBookshelfUpdate: (callback: BookshelfUpdateCallback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data);
    ipcRenderer.on("bookshelf:update", handler);
    return () => ipcRenderer.removeListener("bookshelf:update", handler);
  },

  onTaskUpdate: (callback: TaskUpdateCallback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data);
    ipcRenderer.on("task:update", handler);
    return () => ipcRenderer.removeListener("task:update", handler);
  },

  onDecisionRequest: (callback: DecisionRequestCallback) => {
    const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data);
    ipcRenderer.on("decision:request", handler);
    return () => ipcRenderer.removeListener("decision:request", handler);
  },
};

contextBridge.exposeInMainWorld("api", api);
