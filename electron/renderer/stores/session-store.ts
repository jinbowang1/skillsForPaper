import { create } from "zustand";

export type MessageRole = "user" | "assistant";

export interface ContentBlock {
  type: "text" | "thinking" | "code" | "file" | "citation" | "decision" | "status" | "steps" | "tool" | "image";
  // For text
  text?: string;
  // For image
  imageData?: string;   // base64
  imageMimeType?: string;
  // For code
  language?: string;
  filename?: string;
  code?: string;
  // For file
  filePath?: string;
  fileSize?: number;
  // For citation
  citations?: Array<{
    source: string;
    title: string;
    authors: string;
    year?: string;
    cited?: string;
  }>;
  // For decision
  toolCallId?: string;
  question?: string;
  options?: Array<{ label: string; description?: string }>;
  selectedIndex?: number;
  answered?: boolean;
  customAnswer?: string;
  // For tool
  toolName?: string;
  toolStatus?: "running" | "done" | "error";
  toolArgs?: Record<string, any>;
  toolResult?: string;
  isError?: boolean;
  // For status
  metrics?: any;
  // For steps
  steps?: Array<{ label: string; status: "done" | "current" | "pending" }>;
  taskTitle?: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  blocks: ContentBlock[];
  timestamp: number;
  isStreaming?: boolean;
}

/** Pending free-text decision: user clicked "自由输入" in a DecisionCard */
export interface PendingDecision {
  toolCallId: string;
  question: string;
}

interface SessionState {
  messages: ChatMessage[];
  isStreaming: boolean;
  agentState: "idle" | "working" | "thinking";
  currentModel: string;
  currentModelSupportsImages: boolean;
  pendingDecision: PendingDecision | null;

  addMessage: (msg: ChatMessage) => void;
  updateLastAssistantMessage: (updater: (blocks: ContentBlock[]) => ContentBlock[]) => void;
  appendToLastTextBlock: (text: string) => void;
  setStreaming: (isStreaming: boolean) => void;
  setAgentState: (state: SessionState["agentState"]) => void;
  setModel: (model: string) => void;
  setModelSupportsImages: (supports: boolean) => void;
  markDecisionAnswered: (toolCallId: string, selectedIndex: number, customAnswer?: string) => void;
  setPendingDecision: (decision: PendingDecision | null) => void;
  clearMessages: () => void;
}

let msgIdCounter = 0;
export function generateMsgId(): string {
  return `msg-${Date.now()}-${++msgIdCounter}`;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  messages: [],
  isStreaming: false,
  agentState: "idle",
  currentModel: "Claude Opus 4.5",
  currentModelSupportsImages: true,
  pendingDecision: null,

  addMessage: (msg) => set((state) => ({
    messages: [...state.messages, msg],
  })),

  updateLastAssistantMessage: (updater) => set((state) => {
    const messages = [...state.messages];
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        messages[i] = {
          ...messages[i],
          blocks: updater([...messages[i].blocks]),
        };
        break;
      }
    }
    return { messages };
  }),

  appendToLastTextBlock: (text) => set((state) => {
    const messages = [...state.messages];
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") {
        const blocks = [...messages[i].blocks];
        // Find last text block index (ES5 compatible)
        let lastTextBlockIndex = -1;
        for (let j = blocks.length - 1; j >= 0; j--) {
          if (blocks[j].type === "text") {
            lastTextBlockIndex = j;
            break;
          }
        }
        if (lastTextBlockIndex >= 0) {
          // Create a new block object to maintain immutability
          blocks[lastTextBlockIndex] = {
            ...blocks[lastTextBlockIndex],
            text: (blocks[lastTextBlockIndex].text || "") + text,
          };
        } else {
          blocks.push({ type: "text", text });
        }
        messages[i] = { ...messages[i], blocks };
        break;
      }
    }
    return { messages };
  }),

  setStreaming: (isStreaming) => set({ isStreaming }),

  setAgentState: (agentState) => set({ agentState }),

  setModel: (currentModel) => set({ currentModel }),

  setModelSupportsImages: (currentModelSupportsImages) => set({ currentModelSupportsImages }),

  markDecisionAnswered: (toolCallId, selectedIndex, customAnswer?) => set((state) => {
    const messages = state.messages.map((msg) => ({
      ...msg,
      blocks: msg.blocks.map((block) => {
        if (block.type === "decision" && block.toolCallId === toolCallId) {
          return { ...block, answered: true, selectedIndex, customAnswer };
        }
        return block;
      }),
    }));
    return { messages };
  }),

  setPendingDecision: (decision) => set({ pendingDecision: decision }),

  clearMessages: () => set({ messages: [] }),
}));
