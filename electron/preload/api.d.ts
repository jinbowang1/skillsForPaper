export interface BookshelfItem {
  name: string;
  path: string;
  ext: string;
  size: number;
  mtime: number;
  category: "paper" | "experiment" | "research" | "draft" | "other";
  isActive?: boolean;
}

export interface TaskStep {
  label: string;
  status: "done" | "current" | "pending";
}

export interface TaskState {
  title: string;
  steps: TaskStep[];
  isComplete: boolean;
}

export interface DecisionRequest {
  toolCallId: string;
  question: string;
  options: Array<{ label: string; description?: string }>;
}

export interface SessionState {
  isStreaming: boolean;
  model: string;
}

export interface ElectronAPI {
  // Session
  prompt: (text: string, images?: string[]) => Promise<void>;
  steer: (text: string) => Promise<void>;
  abort: () => Promise<void>;
  getState: () => Promise<SessionState>;
  getModels: () => Promise<Array<{ id: string; name: string }>>;
  setModel: (modelId: string) => Promise<{ model: string }>;

  // Decision
  respondDecision: (toolCallId: string, answer: string) => Promise<void>;

  // File
  openFile: (path: string) => Promise<string>;
  revealFile: (path: string) => Promise<void>;

  // Bookshelf
  getBookshelfItems: () => Promise<BookshelfItem[]>;

  // Task
  getTaskState: () => Promise<TaskState | null>;

  // Event listeners (return unsubscribe function)
  onAgentEvent: (callback: (event: any) => void) => () => void;
  onStateChange: (callback: (state: { isStreaming: boolean; state: string }) => void) => () => void;
  onBookshelfUpdate: (callback: (items: BookshelfItem[]) => void) => () => void;
  onTaskUpdate: (callback: (task: TaskState) => void) => () => void;
  onDecisionRequest: (callback: (req: DecisionRequest) => void) => () => void;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
