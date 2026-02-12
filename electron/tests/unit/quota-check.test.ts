import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * 额度检查端到端测试
 *
 * 模拟完整链路：
 *   getBalance() → checkQuota() → prompt() 抛错 → renderer 错误匹配 → 用户消息
 *
 * 由于 SessionBridge / server-api 依赖 Electron，
 * 这里用与 tool-timeout.test.ts 一样的方式：提取核心逻辑，单独测试。
 */

// ─── 模拟 server-api.getBalance ───────────────────────────────────

type BalanceResult = { balance: number; freeTokens: number } | null;

let mockLoggedIn: boolean;
let mockBalanceResult: BalanceResult;
let mockBalanceShouldThrow: boolean;

function isLoggedIn(): boolean {
  return mockLoggedIn;
}

async function getBalance(): Promise<BalanceResult> {
  if (!isLoggedIn()) return null;
  if (mockBalanceShouldThrow) throw new Error("Network error");
  return mockBalanceResult;
}

// ─── 模拟 checkQuota (与 session-bridge.ts 同逻辑) ────────────────

const warnLogs: string[] = [];

async function checkQuota(): Promise<void> {
  if (!isLoggedIn()) return;
  try {
    const balance = await getBalance();
    if (balance && balance.freeTokens <= 0) {
      throw new Error("QUOTA_EXCEEDED");
    }
  } catch (err: any) {
    if (err.message === "QUOTA_EXCEEDED") throw err;
    warnLogs.push(err.message);
  }
}

// ─── 模拟 prompt（调用 checkQuota 后执行 AI） ─────────────────────

let aiCalled: boolean;

async function prompt(text: string): Promise<void> {
  await checkQuota();
  // 如果 checkQuota 没有抛错，才会到这里
  aiCalled = true;
}

// ─── 模拟 renderer 端错误消息匹配 ─────────────────────────────────

function matchErrorMessage(err: Error): string {
  const errMsg = err.message.toLowerCase();
  if (errMsg.includes("timeout") || errMsg.includes("timed out")) {
    return "⚠ 请求超时，请检查网络后重试";
  } else if (errMsg.includes("network") || errMsg.includes("fetch") || errMsg.includes("econnrefused")) {
    return "⚠ 网络连接失败，请检查网络设置";
  } else if (errMsg.includes("api key") || errMsg.includes("unauthorized") || errMsg.includes("401")) {
    return "⚠ API 密钥无效，请检查配置";
  } else if (errMsg.includes("rate limit") || errMsg.includes("429")) {
    return "⚠ 请求过于频繁，请稍后再试";
  } else if (errMsg.includes("vpn") || errMsg.includes("proxy")) {
    return "⚠ 无法连接到服务，可能需要开启 VPN";
  } else if (errMsg.includes("quota_exceeded")) {
    return [
      "## 🙈 大师兄今天的法力耗尽了！",
      "",
      "你的免费 Token 已经用完啦，大师兄需要打个盹恢复法力 💤",
      "",
      "不过别急，还有三条路可以走：",
      "",
      "| | 方案 | 说明 |",
      "|---|---|---|",
      "| 🌅 | **躺平等待** | 明天免费额度自动刷新，睡一觉就好 |",
      "| ⭐ | **升级订阅** | 解锁更多额度，让大师兄火力全开 |",
      "| 🎁 | **购买 Token 包** | 立即「满血复活」，继续肝论文 |",
      "",
      "> 前往「**设置 → 订阅管理**」查看详情~",
    ].join("\n");
  }
  return "⚠ 发送失败，请重试";
}

// ─── 测试 ────────────────────────────────────────────────────────

beforeEach(() => {
  mockLoggedIn = true;
  mockBalanceResult = { balance: 100, freeTokens: 500 };
  mockBalanceShouldThrow = false;
  aiCalled = false;
  warnLogs.length = 0;
});

describe("getBalance", () => {
  it("returns null when not logged in", async () => {
    mockLoggedIn = false;
    const result = await getBalance();
    expect(result).toBeNull();
  });

  it("returns balance data when logged in", async () => {
    const result = await getBalance();
    expect(result).toEqual({ balance: 100, freeTokens: 500 });
  });

  it("throws when server is unreachable", async () => {
    mockBalanceShouldThrow = true;
    await expect(getBalance()).rejects.toThrow("Network error");
  });
});

describe("checkQuota", () => {
  it("passes when freeTokens > 0", async () => {
    mockBalanceResult = { balance: 100, freeTokens: 500 };
    await expect(checkQuota()).resolves.toBeUndefined();
  });

  it("throws QUOTA_EXCEEDED when freeTokens = 0", async () => {
    mockBalanceResult = { balance: 0, freeTokens: 0 };
    await expect(checkQuota()).rejects.toThrow("QUOTA_EXCEEDED");
  });

  it("throws QUOTA_EXCEEDED when freeTokens < 0", async () => {
    mockBalanceResult = { balance: 0, freeTokens: -100 };
    await expect(checkQuota()).rejects.toThrow("QUOTA_EXCEEDED");
  });

  it("skips check when not logged in", async () => {
    mockLoggedIn = false;
    mockBalanceResult = { balance: 0, freeTokens: 0 };
    // 即使 freeTokens=0，未登录也不阻断
    await expect(checkQuota()).resolves.toBeUndefined();
  });

  it("allows request when server is unreachable (graceful degradation)", async () => {
    mockBalanceShouldThrow = true;
    await expect(checkQuota()).resolves.toBeUndefined();
    expect(warnLogs).toContain("Network error");
  });
});

describe("End-to-end: prompt with quota check", () => {
  it("calls AI when user has enough tokens", async () => {
    mockBalanceResult = { balance: 100, freeTokens: 500 };
    await prompt("写一篇论文");
    expect(aiCalled).toBe(true);
  });

  it("blocks AI call when tokens exhausted", async () => {
    mockBalanceResult = { balance: 0, freeTokens: 0 };
    await expect(prompt("写一篇论文")).rejects.toThrow("QUOTA_EXCEEDED");
    expect(aiCalled).toBe(false);
  });

  it("calls AI when not logged in even with zero tokens", async () => {
    mockLoggedIn = false;
    mockBalanceResult = { balance: 0, freeTokens: 0 };
    await prompt("写一篇论文");
    expect(aiCalled).toBe(true);
  });

  it("calls AI when server is down (not blocking on failure)", async () => {
    mockBalanceShouldThrow = true;
    await prompt("写一篇论文");
    expect(aiCalled).toBe(true);
  });
});

describe("Renderer error message matching", () => {
  it("matches QUOTA_EXCEEDED to humorous message", () => {
    const msg = matchErrorMessage(new Error("QUOTA_EXCEEDED"));
    expect(msg).toContain("大师兄今天的法力耗尽了");
    expect(msg).toContain("躺平等待");
    expect(msg).toContain("升级订阅");
    expect(msg).toContain("购买 Token 包");
    expect(msg).toContain("设置 → 订阅管理");
  });

  it("matches quota_exceeded case-insensitively", () => {
    const msg = matchErrorMessage(new Error("quota_exceeded"));
    expect(msg).toContain("大师兄今天的法力耗尽了");
  });

  it("does not match unrelated errors to quota message", () => {
    const msg = matchErrorMessage(new Error("Something went wrong"));
    expect(msg).toBe("⚠ 发送失败，请重试");
    expect(msg).not.toContain("大师兄");
  });

  it("still matches other error types correctly", () => {
    expect(matchErrorMessage(new Error("timeout"))).toContain("超时");
    expect(matchErrorMessage(new Error("ECONNREFUSED"))).toContain("网络连接失败");
    expect(matchErrorMessage(new Error("rate limit 429"))).toContain("请求过于频繁");
  });
});

describe("Full flow simulation: user sends message → quota exceeded → sees message", () => {
  it("simulates the complete error flow", async () => {
    // 1. 用户 freeTokens = 0
    mockBalanceResult = { balance: 0, freeTokens: 0 };

    // 2. 用户发消息 → prompt() 抛出 QUOTA_EXCEEDED
    let caughtError: Error | null = null;
    try {
      await prompt("帮我分析这篇论文");
    } catch (err: any) {
      caughtError = err;
    }

    // 3. 验证 AI 没有被调用
    expect(aiCalled).toBe(false);
    expect(caughtError).not.toBeNull();
    expect(caughtError!.message).toBe("QUOTA_EXCEEDED");

    // 4. renderer 捕获错误 → 匹配到幽默消息
    const userMessage = matchErrorMessage(caughtError!);
    expect(userMessage).toContain("大师兄今天的法力耗尽了");
    expect(userMessage).toContain("免费 Token 已经用完");
    expect(userMessage).toContain("躺平等待");
    expect(userMessage).toContain("升级订阅");
    expect(userMessage).toContain("购买 Token 包");
  });

  it("simulates normal flow when tokens available", async () => {
    mockBalanceResult = { balance: 100, freeTokens: 1000 };

    await prompt("帮我分析这篇论文");

    // AI 正常调用
    expect(aiCalled).toBe(true);
  });

  it("simulates graceful degradation when server is down", async () => {
    mockBalanceShouldThrow = true;

    await prompt("帮我分析这篇论文");

    // 服务端不可达但 AI 正常调用
    expect(aiCalled).toBe(true);
    expect(warnLogs.length).toBe(1);
  });
});
