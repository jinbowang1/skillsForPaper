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
  supportsImages: boolean;
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

export interface UpdateInfo {
  version: string;
  releaseUrl: string;
  downloadUrl: string;
  releaseNotes: string;
}

export interface CrashReport {
  id: string;
  timestamp: string;
  type: "uncaughtException" | "unhandledRejection" | "rendererCrash" | "gpuCrash";
  message: string;
  stack?: string;
  appVersion: string;
  platform: string;
  arch: string;
}

export interface UsageLimitStatus {
  dailyLimitCny: number;
  currentUsageCny: number;
  percentUsed: number;
  isAtLimit: boolean;
  isNearLimit: boolean;
}

export interface AnalyticsSummary {
  totalEvents: number;
  startDate: string;
  topFeatures: Array<{ name: string; count: number }>;
  recentActivity: Array<{ feature: string; action: string; time: string }>;
}

export interface ExportResult {
  ok: boolean;
  path?: string;
  error?: string;
}

export interface HealthCheckResult {
  permissions: {
    microphone: "granted" | "denied" | "not-determined" | "restricted" | "unknown";
    disk: "ok" | "error";
  };
  tools: {
    python: boolean;
    bash: boolean;
    sox: boolean;
  };
  network: {
    connected: boolean;
    error?: string;
  };
  allGood: boolean;
}

export interface ElectronAPI {
  // Platform
  platform: string;

  // Window Controls
  windowMinimize: () => Promise<void>;
  windowMaximize: () => Promise<void>;
  windowClose: () => Promise<void>;
  windowIsMaximized: () => Promise<boolean>;
  onMaximizedChange: (callback: (isMaximized: boolean) => void) => () => void;

  // Session
  prompt: (text: string, images?: Array<{ data: string; mimeType: string }>) => Promise<void>;
  steer: (text: string) => Promise<void>;
  abort: () => Promise<void>;
  getState: () => Promise<SessionState>;
  getModels: () => Promise<Array<{ id: string; name: string; needsVpn?: boolean; supportsImages?: boolean }>>;
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
  updateUserInfo: (info: UserInfo) => Promise<{ ok: boolean }>;
  getAvatar: () => Promise<string | null>;
  setAvatar: (data: string, mimeType: string) => Promise<{ ok: boolean }>;

  // Voice
  voiceAvailable: () => Promise<boolean>;
  voiceStart: () => Promise<{ ok: boolean; error?: string }>;
  voiceStop: () => Promise<{ text: string; error?: string }>;
  voiceCancel: () => Promise<void>;
  onVoiceInterim: (callback: (text: string) => void) => () => void;
  onVoiceCompleted: (callback: (text: string) => void) => () => void;
  onVoiceError: (callback: (error: string) => void) => () => void;

  // Usage
  getUsageStats: () => Promise<{ date: string; userId: string; models: Array<{ name: string; count: number; tokens: number; cny: number }>; totalCount: number; totalTokens: number; totalCny: number } | null>;
  sendUsageReport: () => Promise<void>;
  checkUsageLimit: () => Promise<UsageLimitStatus>;

  // Crash
  getCrashReports: () => Promise<CrashReport[]>;
  getRecentCrashCount: (days?: number) => Promise<number>;
  onCrashNotify: (callback: (data: { title: string; message: string }) => void) => () => void;

  // Analytics
  getAnalyticsSummary: () => Promise<AnalyticsSummary>;
  trackFeature: (feature: string, action: string, metadata?: Record<string, any>) => Promise<void>;

  // Log Export
  exportLogs: () => Promise<ExportResult>;
  exportLogsAndReveal: () => Promise<ExportResult>;

  // Update
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void;
  openUpdateUrl: (url: string) => Promise<void>;

  // Health Check
  healthCheck: () => Promise<HealthCheckResult>;
  requestMicrophonePermission: () => Promise<boolean>;
  getMicrophoneStatus: () => Promise<"granted" | "denied" | "not-determined" | "restricted" | "unknown">;

  // Chat History
  saveChatHistory: (messages: any[], model: string) => Promise<void>;
  loadChatHistory: () => Promise<{ messages: any[]; model: string } | null>;
  clearChatHistory: () => Promise<void>;

  // Session Management
  newSession: () => Promise<boolean>;

  // Settings
  getOutputDir: () => Promise<{ current: string; default: string }>;
  selectOutputDir: () => Promise<string | null>;
  resetOutputDir: () => Promise<string>;
  revealOutputDir: () => Promise<void>;

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
