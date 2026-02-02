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

export interface UserInfo {
  name: string;
  identity: string;
  institution: string;
  researchField: string;
  advisor: string;
  project: string;
}

export interface SetupConfig {
  anthropicKey: string;
  minimaxKey?: string;
  dashscopeKey?: string;
  moonshotKey?: string;
}

export interface SetupResult {
  ok: boolean;
  error?: string;
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

  // Setup
  submitSetup: (config: SetupConfig) => Promise<SetupResult>;
  onSetupRequired: (callback: () => void) => () => void;

  // File
  openFile: (path: string) => Promise<string>;
  revealFile: (path: string) => Promise<void>;

  // Bookshelf
  getBookshelfItems: () => Promise<BookshelfItem[]>;

  // Task
  getTaskState: () => Promise<TaskState | null>;

  // User
  getUserInfo: () => Promise<UserInfo>;

  // Voice
  voiceAvailable: () => Promise<boolean>;
  voiceStart: () => Promise<{ ok: boolean; error?: string }>;
  voiceStop: () => Promise<{ text: string; error?: string }>;
  voiceCancel: () => Promise<void>;
  onVoiceInterim: (callback: (text: string) => void) => () => void;
  onVoiceCompleted: (callback: (text: string) => void) => () => void;
  onVoiceError: (callback: (error: string) => void) => () => void;

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
