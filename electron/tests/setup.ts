import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

// Mock window.api for all renderer tests
const mockApi = {
  prompt: vi.fn().mockResolvedValue(undefined),
  steer: vi.fn().mockResolvedValue(undefined),
  abort: vi.fn().mockResolvedValue(undefined),
  getState: vi.fn().mockResolvedValue({ isStreaming: false, model: "test" }),
  getModels: vi.fn().mockResolvedValue([{ id: "test", name: "Test Model" }]),
  setModel: vi.fn().mockResolvedValue({ model: "test" }),
  respondDecision: vi.fn().mockResolvedValue(undefined),
  submitSetup: vi.fn().mockResolvedValue({ ok: true }),
  onSetupRequired: vi.fn(() => vi.fn()),
  openFile: vi.fn().mockResolvedValue(""),
  revealFile: vi.fn().mockResolvedValue(undefined),
  getBookshelfItems: vi.fn().mockResolvedValue([]),
  getTaskState: vi.fn().mockResolvedValue(null),
  getUserInfo: vi.fn().mockResolvedValue({
    name: "测试用户", identity: "硕士",
    institution: "测试大学", researchField: "AI",
    advisor: "导师", project: "项目",
  }),
  voiceAvailable: vi.fn().mockResolvedValue(false),
  voiceStart: vi.fn().mockResolvedValue({ ok: true }),
  voiceStop: vi.fn().mockResolvedValue({ text: "" }),
  voiceCancel: vi.fn().mockResolvedValue(undefined),
  onVoiceInterim: vi.fn(() => vi.fn()),
  onVoiceCompleted: vi.fn(() => vi.fn()),
  onVoiceError: vi.fn(() => vi.fn()),
  onAgentEvent: vi.fn(() => vi.fn()),
  onStateChange: vi.fn(() => vi.fn()),
  onBookshelfUpdate: vi.fn(() => vi.fn()),
  onTaskUpdate: vi.fn(() => vi.fn()),
  onDecisionRequest: vi.fn(() => vi.fn()),
  // Usage & Limits
  getUsageStats: vi.fn().mockResolvedValue(null),
  sendUsageReport: vi.fn().mockResolvedValue(undefined),
  checkUsageLimit: vi.fn().mockResolvedValue({ dailyLimitCny: 50, currentUsageCny: 0, percentUsed: 0, isAtLimit: false, isNearLimit: false }),
  // Crash
  getCrashReports: vi.fn().mockResolvedValue([]),
  getRecentCrashCount: vi.fn().mockResolvedValue(0),
  onCrashNotify: vi.fn(() => vi.fn()),
  // Analytics
  getAnalyticsSummary: vi.fn().mockResolvedValue({ totalEvents: 0, startDate: "", topFeatures: [], recentActivity: [] }),
  trackFeature: vi.fn().mockResolvedValue(undefined),
  // Log Export
  exportLogs: vi.fn().mockResolvedValue({ ok: true }),
  exportLogsAndReveal: vi.fn().mockResolvedValue({ ok: true }),
  // Server API (大师兄服务端)
  serverLogin: vi.fn().mockResolvedValue({ success: false }),
  serverRegister: vi.fn().mockResolvedValue({ success: false }),
  serverLogout: vi.fn().mockResolvedValue({ ok: true }),
  serverIsLoggedIn: vi.fn().mockResolvedValue(false),
  serverGetCurrentUser: vi.fn().mockResolvedValue(null),
  serverGetSubscription: vi.fn().mockResolvedValue(null),
  serverGetBalance: vi.fn().mockResolvedValue(null),
  serverGetInviteCode: vi.fn().mockResolvedValue(null),
  serverCheckConnection: vi.fn().mockResolvedValue(false),
  serverReportUsage: vi.fn().mockResolvedValue(true),
  openExternal: vi.fn().mockResolvedValue(true),
};

Object.defineProperty(window, "api", { value: mockApi, writable: true });

// Reset user-store between tests so loaded flag doesn't carry over
afterEach(async () => {
  const { useUserStore } = await import("../renderer/stores/user-store");
  useUserStore.setState({
    userInfo: null,
    userName: "用户",
    userInitial: "用",
    aiName: "大师兄",
    loaded: false,
  });
});
