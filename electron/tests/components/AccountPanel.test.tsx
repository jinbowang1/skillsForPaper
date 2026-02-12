/**
 * AccountPanel 组件测试
 * 重点测试额度用量进度条的渲染
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AccountPanel } from "../../renderer/components/AccountPanel";
import { useAuthStore } from "../../renderer/stores/auth-store";

// 阻止 useEffect 中的 checkAuth() 覆盖我们预设的 store 状态
const noopCheckAuth = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  // 重置 store 到默认值
  useAuthStore.setState({
    isLoggedIn: false,
    isLoading: false,
    user: null,
    subscription: null,
    quotaInfo: null,
    inviteCode: null,
    inviteLink: null,
    serverConnected: false,
    checkAuth: noopCheckAuth as any,
  });
});

function setLoggedInState(overrides: Record<string, any> = {}) {
  useAuthStore.setState({
    isLoggedIn: true,
    isLoading: false,
    user: { id: "user1", email: "test@test.com", nickname: "测试用户", isVerified: true },
    subscription: {
      trial: { isInTrial: false, canTrial: false },
      subscription: null,
      inviteReward: { total: 0, used: 0, available: 0 },
    },
    quotaInfo: { freeTokens: 200000, totalQuota: 300000, quotaType: "daily" as const },
    inviteCode: null,
    inviteLink: null,
    serverConnected: true,
    checkAuth: noopCheckAuth as any,
    ...overrides,
  });
}

describe("AccountPanel - Quota Progress Bar", () => {
  it("shows daily quota section for free users", () => {
    setLoggedInState({
      quotaInfo: { freeTokens: 200000, totalQuota: 300000, quotaType: "daily" },
    });

    render(<AccountPanel />);

    expect(screen.getByText("额度用量")).toBeInTheDocument();
    expect(screen.getByText("每日免费额度")).toBeInTheDocument();
  });

  it("shows monthly quota section for subscribed users", () => {
    setLoggedInState({
      quotaInfo: { freeTokens: 8000000, totalQuota: 10000000, quotaType: "monthly" },
      subscription: {
        trial: { isInTrial: false, canTrial: false },
        subscription: {
          id: "sub1", planCode: "pro", planName: "专业版",
          status: "ACTIVE", startDate: "2026-01-01", endDate: "2026-02-01",
          monthlyTokens: 10000000, usedTokens: 2000000, tokenResetAt: "2026-02-01",
        },
        inviteReward: { total: 0, used: 0, available: 0 },
      },
    });

    render(<AccountPanel />);

    expect(screen.getByText("额度用量")).toBeInTheDocument();
    expect(screen.getByText("月度额度 + 每日赠送")).toBeInTheDocument();
  });

  it("displays used / total formatted tokens", () => {
    setLoggedInState({
      quotaInfo: { freeTokens: 200000, totalQuota: 300000, quotaType: "daily" },
    });

    render(<AccountPanel />);

    // used = 300000 - 200000 = 100000 → "100K"
    // total = 300000 → "300K"
    expect(screen.getByText("已用 100K / 300K")).toBeInTheDocument();
  });

  it("displays million-scale tokens for subscribers", () => {
    setLoggedInState({
      quotaInfo: { freeTokens: 8000000, totalQuota: 10000000, quotaType: "monthly" },
      subscription: {
        trial: { isInTrial: false, canTrial: false },
        subscription: {
          id: "sub1", planCode: "pro", planName: "专业版",
          status: "ACTIVE", startDate: "", endDate: "2026-03-01",
          monthlyTokens: 10000000, usedTokens: 2000000, tokenResetAt: "",
        },
        inviteReward: { total: 0, used: 0, available: 0 },
      },
    });

    render(<AccountPanel />);

    // used = 10000000 - 8000000 = 2000000 → "2.0M"
    // total = 10000000 → "10.0M"
    expect(screen.getByText("已用 2.0M / 10.0M")).toBeInTheDocument();
  });

  it("shows progress bar fill element", () => {
    setLoggedInState({
      quotaInfo: { freeTokens: 150000, totalQuota: 300000, quotaType: "daily" },
    });

    const { container } = render(<AccountPanel />);

    const fill = container.querySelector(".account-quota-fill");
    expect(fill).not.toBeNull();
    // 50% usage → width: 50%
    expect(fill?.getAttribute("style")).toContain("width: 50%");
  });

  it("applies warning class when usage >= 80%", () => {
    setLoggedInState({
      quotaInfo: { freeTokens: 50000, totalQuota: 300000, quotaType: "daily" },
    });

    const { container } = render(<AccountPanel />);

    const fill = container.querySelector(".account-quota-fill");
    expect(fill?.classList.contains("warning")).toBe(true);
  });

  it("applies exhausted class when usage >= 100%", () => {
    setLoggedInState({
      quotaInfo: { freeTokens: 0, totalQuota: 300000, quotaType: "daily" },
    });

    const { container } = render(<AccountPanel />);

    const fill = container.querySelector(".account-quota-fill");
    expect(fill?.classList.contains("exhausted")).toBe(true);
  });

  it("shows daily refresh hint when quota exhausted", () => {
    setLoggedInState({
      quotaInfo: { freeTokens: 0, totalQuota: 300000, quotaType: "daily" },
    });

    render(<AccountPanel />);

    expect(screen.getByText("明日凌晨自动刷新")).toBeInTheDocument();
  });

  it("shows monthly refresh hint when monthly quota exhausted", () => {
    setLoggedInState({
      quotaInfo: { freeTokens: 0, totalQuota: 10000000, quotaType: "monthly" },
      subscription: {
        trial: { isInTrial: false, canTrial: false },
        subscription: {
          id: "sub1", planCode: "pro", planName: "专业版",
          status: "ACTIVE", startDate: "", endDate: "2026-03-01",
          monthlyTokens: 10000000, usedTokens: 10000000, tokenResetAt: "",
        },
        inviteReward: { total: 0, used: 0, available: 0 },
      },
    });

    render(<AccountPanel />);

    expect(screen.getByText("下个月自动刷新")).toBeInTheDocument();
  });

  it("does not show refresh hint when quota not exhausted", () => {
    setLoggedInState({
      quotaInfo: { freeTokens: 150000, totalQuota: 300000, quotaType: "daily" },
    });

    render(<AccountPanel />);

    expect(screen.queryByText("明日凌晨自动刷新")).not.toBeInTheDocument();
    expect(screen.queryByText("下个月自动刷新")).not.toBeInTheDocument();
  });

  it("does not show quota section when quotaInfo is null", () => {
    setLoggedInState({ quotaInfo: null });

    render(<AccountPanel />);

    expect(screen.queryByText("额度用量")).not.toBeInTheDocument();
  });

  it("shows full width at 0 tokens remaining", () => {
    setLoggedInState({
      quotaInfo: { freeTokens: 0, totalQuota: 300000, quotaType: "daily" },
    });

    const { container } = render(<AccountPanel />);

    const fill = container.querySelector(".account-quota-fill");
    expect(fill?.getAttribute("style")).toContain("width: 100%");
  });

  it("shows zero width when no tokens used", () => {
    setLoggedInState({
      quotaInfo: { freeTokens: 300000, totalQuota: 300000, quotaType: "daily" },
    });

    const { container } = render(<AccountPanel />);

    const fill = container.querySelector(".account-quota-fill");
    expect(fill?.getAttribute("style")).toContain("width: 0%");
  });

  it("shows zero width and bonus hint when freeTokens exceeds totalQuota", () => {
    setLoggedInState({
      quotaInfo: { freeTokens: 10300000, totalQuota: 10000000, quotaType: "monthly" },
      subscription: {
        trial: { isInTrial: false, canTrial: false },
        subscription: {
          id: "sub1", planCode: "pro", planName: "专业版",
          status: "ACTIVE", startDate: "", endDate: "2026-03-01",
          monthlyTokens: 10000000, usedTokens: 0, tokenResetAt: "",
        },
        inviteReward: { total: 0, used: 0, available: 0 },
      },
    });

    const { container } = render(<AccountPanel />);

    // freeTokens > totalQuota → 0% width
    const fill = container.querySelector(".account-quota-fill");
    expect(fill?.getAttribute("style")).toContain("width: 0%");
    // 显示每日赠送累计提示
    expect(screen.getByText(/每日赠送累计/)).toBeInTheDocument();
    // used = 0（freeTokens > totalQuota 时已用为 0）
    expect(screen.getByText("已用 0 / 10.0M")).toBeInTheDocument();
  });

  it("shows monthly label with daily bonus text", () => {
    setLoggedInState({
      quotaInfo: { freeTokens: 8000000, totalQuota: 10000000, quotaType: "monthly" },
      subscription: {
        trial: { isInTrial: false, canTrial: false },
        subscription: {
          id: "sub1", planCode: "pro", planName: "专业版",
          status: "ACTIVE", startDate: "", endDate: "2026-03-01",
          monthlyTokens: 10000000, usedTokens: 2000000, tokenResetAt: "",
        },
        inviteReward: { total: 0, used: 0, available: 0 },
      },
    });

    render(<AccountPanel />);

    expect(screen.getByText("月度额度 + 每日赠送")).toBeInTheDocument();
  });
});

describe("AccountPanel - User Info Display", () => {
  it("shows user nickname", () => {
    setLoggedInState();

    render(<AccountPanel />);

    expect(screen.getByText("测试用户")).toBeInTheDocument();
  });

  it("shows user email", () => {
    setLoggedInState();

    render(<AccountPanel />);

    expect(screen.getByText("test@test.com")).toBeInTheDocument();
  });
});

describe("AccountPanel - Loading State", () => {
  it("shows loading spinner when isLoading", () => {
    useAuthStore.setState({
      isLoggedIn: false,
      isLoading: true,
      user: null,
      subscription: null,
      quotaInfo: null,
      inviteCode: null,
      inviteLink: null,
      serverConnected: false,
      checkAuth: noopCheckAuth as any,
    });

    render(<AccountPanel />);

    expect(screen.getByText("账户")).toBeInTheDocument();
  });
});
