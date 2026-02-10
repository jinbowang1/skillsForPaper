/**
 * 认证状态管理
 * 管理用户登录状态、订阅信息等
 */

import { create } from "zustand";

interface ServerUser {
  id: string;
  email: string;
  nickname: string;
  avatar?: string;
  isVerified: boolean;
}

interface SubscriptionInfo {
  trial: {
    isInTrial: boolean;
    canTrial: boolean;
    startAt?: string;
    endAt?: string;
  };
  subscription: {
    id: string;
    planCode: string;
    planName: string;
    status: string;
    startDate: string;
    endDate: string;
    monthlyTokens: number;
    usedTokens: number;
    tokenResetAt: string;
  } | null;
  inviteReward: {
    total: number;
    used: number;
    available: number;
  };
}

interface AuthState {
  // 登录状态
  isLoggedIn: boolean;
  isLoading: boolean;
  user: ServerUser | null;

  // 订阅状态
  subscription: SubscriptionInfo | null;

  // 邀请码
  inviteCode: string | null;
  inviteLink: string | null;

  // 服务端连接状态
  serverConnected: boolean;

  // Actions
  checkAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, nickname?: string, inviteCode?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  refreshInviteCode: () => Promise<void>;
  checkServerConnection: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isLoggedIn: false,
  isLoading: true,
  user: null,
  subscription: null,
  inviteCode: null,
  inviteLink: null,
  serverConnected: false,

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      // 检查服务端连接
      const connected = await window.api.serverCheckConnection();
      set({ serverConnected: connected });

      if (!connected) {
        set({ isLoggedIn: false, user: null, isLoading: false });
        return;
      }

      // 检查登录状态
      const loggedIn = await window.api.serverIsLoggedIn();
      if (loggedIn) {
        const user = await window.api.serverGetCurrentUser();
        set({ isLoggedIn: true, user });

        // 获取订阅信息
        const subscription = await window.api.serverGetSubscription();
        set({ subscription });

        // 获取邀请码
        const inviteData = await window.api.serverGetInviteCode();
        if (inviteData) {
          set({ inviteCode: inviteData.code, inviteLink: inviteData.link });
        }
      } else {
        set({ isLoggedIn: false, user: null });
      }
    } catch (error) {
      console.error("Check auth error:", error);
      set({ isLoggedIn: false, user: null });
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    try {
      const result = await window.api.serverLogin(email, password);
      if (result.success && result.user) {
        set({ isLoggedIn: true, user: result.user });

        // 获取订阅信息
        const subscription = await window.api.serverGetSubscription();
        set({ subscription });

        // 获取邀请码
        const inviteData = await window.api.serverGetInviteCode();
        if (inviteData) {
          set({ inviteCode: inviteData.code, inviteLink: inviteData.link });
        }

        return { success: true };
      }
      return { success: false, error: result.error || "登录失败" };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "登录失败，请检查网络连接" };
    }
  },

  register: async (email: string, password: string, nickname?: string, inviteCode?: string) => {
    try {
      const result = await window.api.serverRegister(email, password, nickname, inviteCode);
      if (result.success) {
        return { success: true };
      }
      return { success: false, error: result.error || "注册失败" };
    } catch (error) {
      console.error("Register error:", error);
      return { success: false, error: "注册失败，请检查网络连接" };
    }
  },

  logout: async () => {
    try {
      await window.api.serverLogout();
    } catch (error) {
      console.error("Logout error:", error);
    }
    set({
      isLoggedIn: false,
      user: null,
      subscription: null,
      inviteCode: null,
      inviteLink: null,
    });
  },

  refreshSubscription: async () => {
    if (!get().isLoggedIn) return;
    try {
      const subscription = await window.api.serverGetSubscription();
      set({ subscription });
    } catch (error) {
      console.error("Refresh subscription error:", error);
    }
  },

  refreshInviteCode: async () => {
    if (!get().isLoggedIn) return;
    try {
      const inviteData = await window.api.serverGetInviteCode();
      if (inviteData) {
        set({ inviteCode: inviteData.code, inviteLink: inviteData.link });
      }
    } catch (error) {
      console.error("Refresh invite code error:", error);
    }
  },

  checkServerConnection: async () => {
    try {
      const connected = await window.api.serverCheckConnection();
      set({ serverConnected: connected });
      return connected;
    } catch {
      set({ serverConnected: false });
      return false;
    }
  },
}));

/**
 * 检查用户是否有有效订阅或试用期
 */
export function hasActiveSubscription(subscription: SubscriptionInfo | null): boolean {
  if (!subscription) return false;

  // 试用期有效
  if (subscription.trial.isInTrial) return true;

  // 有激活的订阅
  if (subscription.subscription && subscription.subscription.status === "ACTIVE") {
    return true;
  }

  return false;
}

/**
 * 获取剩余可用 Token 数
 */
export function getRemainingTokens(subscription: SubscriptionInfo | null): number {
  if (!subscription || !subscription.subscription) return 0;

  const sub = subscription.subscription;
  if (sub.status !== "ACTIVE") return 0;

  return Math.max(0, sub.monthlyTokens - sub.usedTokens);
}

/**
 * 格式化 Token 数量
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(0)}K`;
  }
  return tokens.toString();
}
