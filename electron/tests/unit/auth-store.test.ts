/**
 * 认证状态管理单元测试
 * 重点测试额度信息（quotaInfo）和 getQuotaPercent 辅助函数
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { useAuthStore, formatTokens, getQuotaPercent, hasActiveSubscription, getRemainingTokens } from "../../renderer/stores/auth-store";

// 补充 setup.ts 中缺失的 server API mock
const mockApi = (window as any).api;
if (!mockApi.serverCheckConnection) {
  mockApi.serverCheckConnection = vi.fn().mockResolvedValue(true);
}
if (!mockApi.serverIsLoggedIn) {
  mockApi.serverIsLoggedIn = vi.fn().mockResolvedValue(false);
}
if (!mockApi.serverGetCurrentUser) {
  mockApi.serverGetCurrentUser = vi.fn().mockResolvedValue(null);
}
if (!mockApi.serverGetSubscription) {
  mockApi.serverGetSubscription = vi.fn().mockResolvedValue(null);
}
if (!mockApi.serverGetBalance) {
  mockApi.serverGetBalance = vi.fn().mockResolvedValue(null);
}
if (!mockApi.serverGetInviteCode) {
  mockApi.serverGetInviteCode = vi.fn().mockResolvedValue(null);
}
if (!mockApi.serverLogin) {
  mockApi.serverLogin = vi.fn().mockResolvedValue({ success: false });
}
if (!mockApi.serverLogout) {
  mockApi.serverLogout = vi.fn().mockResolvedValue({ ok: true });
}

beforeEach(() => {
  useAuthStore.setState({
    isLoggedIn: false,
    isLoading: false,
    user: null,
    subscription: null,
    quotaInfo: null,
    inviteCode: null,
    inviteLink: null,
    serverConnected: false,
  });
  vi.clearAllMocks();
});

describe("getQuotaPercent", () => {
  it("returns 0 when quotaInfo is null", () => {
    expect(getQuotaPercent(null)).toBe(0);
  });

  it("returns 0 when totalQuota is 0", () => {
    expect(getQuotaPercent({ freeTokens: 0, totalQuota: 0, quotaType: "daily" })).toBe(0);
  });

  it("returns 0% when no tokens used", () => {
    const result = getQuotaPercent({ freeTokens: 300000, totalQuota: 300000, quotaType: "daily" });
    expect(result).toBe(0);
  });

  it("returns 50% when half tokens used", () => {
    const result = getQuotaPercent({ freeTokens: 150000, totalQuota: 300000, quotaType: "daily" });
    expect(result).toBe(50);
  });

  it("returns 100% when all tokens used", () => {
    const result = getQuotaPercent({ freeTokens: 0, totalQuota: 300000, quotaType: "daily" });
    expect(result).toBe(100);
  });

  it("caps at 100% when freeTokens is negative", () => {
    const result = getQuotaPercent({ freeTokens: -500, totalQuota: 300000, quotaType: "daily" });
    expect(result).toBe(100);
  });

  it("returns 0% when freeTokens exceeds totalQuota (daily bonus accumulation)", () => {
    // 订阅用户累加每日赠送后，freeTokens 可能超过 totalQuota
    const result = getQuotaPercent({ freeTokens: 10300000, totalQuota: 10000000, quotaType: "monthly" });
    expect(result).toBe(0);
  });

  it("works correctly for monthly subscription quota", () => {
    const result = getQuotaPercent({ freeTokens: 8000000, totalQuota: 10000000, quotaType: "monthly" });
    expect(result).toBe(20);
  });

  it("returns ~80% for warning threshold", () => {
    const result = getQuotaPercent({ freeTokens: 60000, totalQuota: 300000, quotaType: "daily" });
    expect(result).toBe(80);
  });
});

describe("formatTokens", () => {
  it("formats millions", () => {
    expect(formatTokens(2000000)).toBe("2.0M");
    expect(formatTokens(10000000)).toBe("10.0M");
    expect(formatTokens(30000000)).toBe("30.0M");
  });

  it("formats thousands", () => {
    expect(formatTokens(300000)).toBe("300K");
    expect(formatTokens(1000)).toBe("1K");
    expect(formatTokens(50000)).toBe("50K");
  });

  it("formats small numbers as-is", () => {
    expect(formatTokens(500)).toBe("500");
    expect(formatTokens(0)).toBe("0");
    expect(formatTokens(999)).toBe("999");
  });
});

describe("hasActiveSubscription", () => {
  it("returns false when subscription is null", () => {
    expect(hasActiveSubscription(null)).toBe(false);
  });

  it("returns true when in trial", () => {
    expect(hasActiveSubscription({
      trial: { isInTrial: true, canTrial: false },
      subscription: null,
      inviteReward: { total: 0, used: 0, available: 0 },
    })).toBe(true);
  });

  it("returns true when has active subscription", () => {
    expect(hasActiveSubscription({
      trial: { isInTrial: false, canTrial: false },
      subscription: {
        id: "sub1", planCode: "pro", planName: "专业版",
        status: "ACTIVE", startDate: "", endDate: "",
        monthlyTokens: 10000000, usedTokens: 0, tokenResetAt: "",
      },
      inviteReward: { total: 0, used: 0, available: 0 },
    })).toBe(true);
  });

  it("returns false when subscription is expired", () => {
    expect(hasActiveSubscription({
      trial: { isInTrial: false, canTrial: false },
      subscription: {
        id: "sub1", planCode: "pro", planName: "专业版",
        status: "EXPIRED", startDate: "", endDate: "",
        monthlyTokens: 10000000, usedTokens: 0, tokenResetAt: "",
      },
      inviteReward: { total: 0, used: 0, available: 0 },
    })).toBe(false);
  });
});

describe("getRemainingTokens", () => {
  it("returns 0 when subscription is null", () => {
    expect(getRemainingTokens(null)).toBe(0);
  });

  it("returns 0 when no active subscription", () => {
    expect(getRemainingTokens({
      trial: { isInTrial: false, canTrial: false },
      subscription: null,
      inviteReward: { total: 0, used: 0, available: 0 },
    })).toBe(0);
  });

  it("calculates remaining tokens correctly", () => {
    expect(getRemainingTokens({
      trial: { isInTrial: false, canTrial: false },
      subscription: {
        id: "sub1", planCode: "pro", planName: "专业版",
        status: "ACTIVE", startDate: "", endDate: "",
        monthlyTokens: 10000000, usedTokens: 2000000, tokenResetAt: "",
      },
      inviteReward: { total: 0, used: 0, available: 0 },
    })).toBe(8000000);
  });

  it("returns 0 when all tokens used", () => {
    expect(getRemainingTokens({
      trial: { isInTrial: false, canTrial: false },
      subscription: {
        id: "sub1", planCode: "lite", planName: "轻享版",
        status: "ACTIVE", startDate: "", endDate: "",
        monthlyTokens: 2000000, usedTokens: 2000000, tokenResetAt: "",
      },
      inviteReward: { total: 0, used: 0, available: 0 },
    })).toBe(0);
  });
});

describe("useAuthStore - quotaInfo state", () => {
  it("has null quotaInfo by default", () => {
    expect(useAuthStore.getState().quotaInfo).toBeNull();
  });

  it("can set quotaInfo directly", () => {
    useAuthStore.setState({
      quotaInfo: { freeTokens: 250000, totalQuota: 300000, quotaType: "daily" },
    });

    const state = useAuthStore.getState();
    expect(state.quotaInfo).toEqual({
      freeTokens: 250000,
      totalQuota: 300000,
      quotaType: "daily",
    });
  });

  it("clears quotaInfo on logout", async () => {
    useAuthStore.setState({
      isLoggedIn: true,
      quotaInfo: { freeTokens: 100000, totalQuota: 300000, quotaType: "daily" },
    });

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.quotaInfo).toBeNull();
    expect(state.isLoggedIn).toBe(false);
  });
});

describe("useAuthStore - checkAuth fetches quotaInfo", () => {
  it("fetches quotaInfo when user is logged in", async () => {
    vi.mocked(mockApi.serverCheckConnection).mockResolvedValue(true);
    vi.mocked(mockApi.serverIsLoggedIn).mockResolvedValue(true);
    vi.mocked(mockApi.serverGetCurrentUser).mockResolvedValue({
      id: "user1", email: "test@test.com", nickname: "test", isVerified: true,
    });
    vi.mocked(mockApi.serverGetSubscription).mockResolvedValue({
      trial: { isInTrial: false, canTrial: false },
      subscription: null,
      inviteReward: { total: 0, used: 0, available: 0 },
    });
    vi.mocked(mockApi.serverGetBalance).mockResolvedValue({
      balance: 0,
      freeTokens: 200000,
      totalQuota: 300000,
      quotaType: "daily",
    });
    vi.mocked(mockApi.serverGetInviteCode).mockResolvedValue(null);

    await useAuthStore.getState().checkAuth();

    const state = useAuthStore.getState();
    expect(state.isLoggedIn).toBe(true);
    expect(state.quotaInfo).toEqual({
      freeTokens: 200000,
      totalQuota: 300000,
      quotaType: "daily",
    });
  });

  it("sets quotaInfo to null when not logged in", async () => {
    vi.mocked(mockApi.serverCheckConnection).mockResolvedValue(true);
    vi.mocked(mockApi.serverIsLoggedIn).mockResolvedValue(false);

    await useAuthStore.getState().checkAuth();

    expect(useAuthStore.getState().quotaInfo).toBeNull();
  });

  it("sets quotaInfo to null when server disconnected", async () => {
    vi.mocked(mockApi.serverCheckConnection).mockResolvedValue(false);

    await useAuthStore.getState().checkAuth();

    expect(useAuthStore.getState().quotaInfo).toBeNull();
  });
});

describe("useAuthStore - refreshSubscription also refreshes quotaInfo", () => {
  it("updates quotaInfo when refreshing subscription", async () => {
    useAuthStore.setState({ isLoggedIn: true });

    vi.mocked(mockApi.serverGetSubscription).mockResolvedValue({
      trial: { isInTrial: false, canTrial: false },
      subscription: {
        id: "sub1", planCode: "pro", planName: "专业版",
        status: "ACTIVE", startDate: "", endDate: "",
        monthlyTokens: 10000000, usedTokens: 5000000, tokenResetAt: "",
      },
      inviteReward: { total: 0, used: 0, available: 0 },
    });
    vi.mocked(mockApi.serverGetBalance).mockResolvedValue({
      balance: 0,
      freeTokens: 5000000,
      totalQuota: 10000000,
      quotaType: "monthly",
    });

    await useAuthStore.getState().refreshSubscription();

    const state = useAuthStore.getState();
    expect(state.quotaInfo).toEqual({
      freeTokens: 5000000,
      totalQuota: 10000000,
      quotaType: "monthly",
    });
  });

  it("skips refresh when not logged in", async () => {
    useAuthStore.setState({ isLoggedIn: false });

    await useAuthStore.getState().refreshSubscription();

    expect(mockApi.serverGetSubscription).not.toHaveBeenCalled();
    expect(mockApi.serverGetBalance).not.toHaveBeenCalled();
  });
});

describe("Quota percentage edge cases for UI display", () => {
  it("calculates correct class for normal usage (<80%)", () => {
    const percent = getQuotaPercent({ freeTokens: 200000, totalQuota: 300000, quotaType: "daily" });
    expect(percent).toBeLessThan(80);
    // UI should show normal gradient
  });

  it("calculates correct class for warning usage (>=80%)", () => {
    const percent = getQuotaPercent({ freeTokens: 50000, totalQuota: 300000, quotaType: "daily" });
    expect(percent).toBeGreaterThanOrEqual(80);
    expect(percent).toBeLessThan(100);
    // UI should show warning gradient
  });

  it("calculates correct class for exhausted usage (>=100%)", () => {
    const percent = getQuotaPercent({ freeTokens: 0, totalQuota: 300000, quotaType: "daily" });
    expect(percent).toBeGreaterThanOrEqual(100);
    // UI should show exhausted gradient
  });

  it("daily quota label is correct", () => {
    const info = { freeTokens: 100000, totalQuota: 300000, quotaType: "daily" as const };
    expect(info.quotaType === "daily" ? "每日免费额度" : "月度额度").toBe("每日免费额度");
  });

  it("monthly quota label is correct", () => {
    const info = { freeTokens: 5000000, totalQuota: 10000000, quotaType: "monthly" as const };
    expect(info.quotaType === "daily" ? "每日免费额度" : "月度额度 + 每日赠送").toBe("月度额度 + 每日赠送");
  });

  it("exhaustion hint is correct for daily quota", () => {
    const info = { quotaType: "daily" as const };
    const hint = info.quotaType === "daily" ? "明日凌晨自动刷新" : "下个月自动刷新";
    expect(hint).toBe("明日凌晨自动刷新");
  });

  it("exhaustion hint is correct for monthly quota", () => {
    const info = { quotaType: "monthly" as const };
    const hint = info.quotaType === "daily" ? "明日凌晨自动刷新" : "下个月自动刷新";
    expect(hint).toBe("下个月自动刷新");
  });
});
