/**
 * 大师兄服务端 API 客户端
 * 用于用户认证、订阅管理、使用统计上报
 */

import { app } from "electron";
import * as fs from "fs";
import * as path from "path";
import { logger } from "./app-logger.js";

// 服务端地址
const API_BASE = process.env.DASHIXIONG_API_URL || "http://localhost:3000";

// Token 存储路径
const USER_DATA_DIR = app.getPath("userData");
const AUTH_FILE = path.join(USER_DATA_DIR, "auth.json");

// 认证信息接口
interface AuthData {
  token: string;
  user: {
    id: string;
    email: string;
    nickname: string;
    avatar?: string;
    isVerified: boolean;
  };
  expiresAt?: number;
}

// 订阅信息接口
export interface SubscriptionInfo {
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

// 使用统计接口
export interface UsageRecord {
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  requestId?: string;
  latencyMs?: number;
}

// 缓存当前认证信息
let cachedAuth: AuthData | null = null;

/**
 * 加载保存的认证信息
 */
function loadAuth(): AuthData | null {
  if (cachedAuth) return cachedAuth;

  try {
    if (fs.existsSync(AUTH_FILE)) {
      const data = fs.readFileSync(AUTH_FILE, "utf-8");
      cachedAuth = JSON.parse(data);

      // 检查是否过期
      if (cachedAuth?.expiresAt && cachedAuth.expiresAt < Date.now()) {
        logger.info("[server-api] Token expired, clearing auth");
        clearAuth();
        return null;
      }

      return cachedAuth;
    }
  } catch (err) {
    logger.error("[server-api] Failed to load auth:", err);
  }
  return null;
}

/**
 * 保存认证信息
 */
function saveAuth(auth: AuthData): void {
  try {
    // 设置过期时间（7天）
    auth.expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    fs.writeFileSync(AUTH_FILE, JSON.stringify(auth, null, 2));
    cachedAuth = auth;
    logger.info("[server-api] Auth saved successfully");
  } catch (err) {
    logger.error("[server-api] Failed to save auth:", err);
  }
}

/**
 * 清除认证信息
 */
function clearAuth(): void {
  try {
    if (fs.existsSync(AUTH_FILE)) {
      fs.unlinkSync(AUTH_FILE);
    }
    cachedAuth = null;
    logger.info("[server-api] Auth cleared");
  } catch (err) {
    logger.error("[server-api] Failed to clear auth:", err);
  }
}

/**
 * 发送 API 请求
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string }> {
  const auth = loadAuth();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (auth?.token) {
    headers["Authorization"] = `Bearer ${auth.token}`;
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      // Token 过期
      if (response.status === 401) {
        clearAuth();
      }
      return {
        success: false,
        error: data.message || data.error || `HTTP ${response.status}`,
      };
    }

    return { success: true, data };
  } catch (err) {
    logger.error(`[server-api] Request failed: ${endpoint}`, err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "网络错误",
    };
  }
}

/**
 * 用户登录
 */
export async function login(
  email: string,
  password: string
): Promise<{ success: boolean; user?: AuthData["user"]; error?: string }> {
  const result = await request<{ token: string; user: AuthData["user"] }>(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }
  );

  if (result.success && result.data) {
    saveAuth({
      token: result.data.token,
      user: result.data.user,
    });
    return { success: true, user: result.data.user };
  }

  return { success: false, error: result.error };
}

/**
 * 用户注册
 */
export async function register(
  email: string,
  password: string,
  nickname?: string,
  inviteCode?: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const result = await request<{ message: string }>(
    "/api/auth/register",
    {
      method: "POST",
      body: JSON.stringify({ email, password, nickname, inviteCode }),
    }
  );

  if (result.success && result.data) {
    return { success: true, message: result.data.message };
  }

  return { success: false, error: result.error };
}

/**
 * 用户登出
 */
export async function logout(): Promise<void> {
  await request("/api/auth/logout", { method: "POST" });
  clearAuth();
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(): Promise<AuthData["user"] | null> {
  const auth = loadAuth();
  if (!auth) return null;

  const result = await request<AuthData["user"]>("/api/user/me");

  if (result.success && result.data) {
    // 更新缓存
    auth.user = result.data;
    saveAuth(auth);
    return result.data;
  }

  return auth.user;
}

/**
 * 检查是否已登录
 */
export function isLoggedIn(): boolean {
  const auth = loadAuth();
  return auth !== null && auth.token !== undefined;
}

/**
 * 获取认证 Token
 */
export function getToken(): string | null {
  const auth = loadAuth();
  return auth?.token || null;
}

/**
 * 获取缓存的用户信息
 */
export function getCachedUser(): AuthData["user"] | null {
  const auth = loadAuth();
  return auth?.user || null;
}

/**
 * 获取订阅状态
 */
export async function getSubscription(): Promise<SubscriptionInfo | null> {
  const result = await request<SubscriptionInfo>("/api/subscription/current");

  if (result.success && result.data) {
    return result.data;
  }

  return null;
}

/**
 * 获取邀请码
 */
export async function getInviteCode(): Promise<{ code: string; link: string } | null> {
  const result = await request<{ code: string; link: string }>("/api/invite/code");

  if (result.success && result.data) {
    return result.data;
  }

  return null;
}

/**
 * 上报使用统计
 */
export async function reportUsage(usage: UsageRecord): Promise<boolean> {
  // 如果未登录，跳过上报
  if (!isLoggedIn()) {
    logger.info("[server-api] Not logged in, skipping usage report");
    return false;
  }

  const result = await request("/api/billing/usage", {
    method: "POST",
    body: JSON.stringify(usage),
  });

  return result.success;
}

/**
 * 批量上报使用统计
 */
export async function reportUsageBatch(usages: UsageRecord[]): Promise<boolean> {
  if (!isLoggedIn()) {
    return false;
  }

  const result = await request("/api/billing/usage/batch", {
    method: "POST",
    body: JSON.stringify({ records: usages }),
  });

  return result.success;
}

/**
 * 检查服务端连接
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * 获取服务端 API 基础地址
 */
export function getApiBaseUrl(): string {
  return API_BASE;
}

// 导出服务
export const serverApi = {
  login,
  register,
  logout,
  getCurrentUser,
  isLoggedIn,
  getToken,
  getCachedUser,
  getSubscription,
  getInviteCode,
  reportUsage,
  reportUsageBatch,
  checkConnection,
  getApiBaseUrl,
};
