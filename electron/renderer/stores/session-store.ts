import { create } from "zustand";

export type MessageRole = "user" | "assistant";

export interface ContentBlock {
  type: "text" | "thinking" | "code" | "file" | "citation" | "decision" | "status" | "steps" | "tool";
  // For text
  text?: string;
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

interface SessionState {
  messages: ChatMessage[];
  isStreaming: boolean;
  agentState: "idle" | "working" | "thinking";
  currentModel: string;

  addMessage: (msg: ChatMessage) => void;
  updateLastAssistantMessage: (updater: (blocks: ContentBlock[]) => ContentBlock[]) => void;
  appendToLastTextBlock: (text: string) => void;
  setStreaming: (isStreaming: boolean) => void;
  setAgentState: (state: SessionState["agentState"]) => void;
  setModel: (model: string) => void;
  markDecisionAnswered: (toolCallId: string, selectedIndex: number) => void;
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
        const lastTextBlock = blocks.findLast((b) => b.type === "text");
        if (lastTextBlock) {
          lastTextBlock.text = (lastTextBlock.text || "") + text;
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

  markDecisionAnswered: (toolCallId, selectedIndex) => set((state) => {
    const messages = state.messages.map((msg) => ({
      ...msg,
      blocks: msg.blocks.map((block) => {
        if (block.type === "decision" && block.toolCallId === toolCallId) {
          return { ...block, answered: true, selectedIndex };
        }
        return block;
      }),
    }));
    return { messages };
  }),
}));
