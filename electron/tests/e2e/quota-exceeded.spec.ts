import { test, expect, _electron as electron } from "@playwright/test";
import path from "path";
import http from "http";
import fs from "fs";

/**
 * E2E: Token 用完后暂停服务 + 幽默提示
 *
 * 三种策略：
 * A) IPC mock — 用 app.evaluate() 在 main 进程替换 IPC handler，测 renderer 错误 UI
 * B) Full-stack — 启动 mock server（返回 freeTokens=0）+ 写 auth.json，测完整链路
 * C) Graceful degradation — 服务端不可达时不阻断
 *
 * 注意：
 * - contextBridge 使 window.api 不可写，mock 必须在 main 进程 (app.evaluate) 操作
 * - 通过 Playwright 启动的 Electron，userData 路径为 ~/Library/Application Support/Electron
 *   （非 forge 打包时的 dashixiong），所以 auth.json 路径需要从 app.evaluate 获取
 */

// 绕过系统代理，确保 Electron 能直连 localhost mock server
function proxyFreeEnv(extra: Record<string, string> = {}) {
  const env = { ...process.env };
  delete env.HTTP_PROXY;
  delete env.HTTPS_PROXY;
  delete env.http_proxy;
  delete env.https_proxy;
  return {
    ...env,
    NO_PROXY: "localhost,127.0.0.1",
    no_proxy: "localhost,127.0.0.1",
    NODE_ENV: "test",
    ...extra,
  };
}

// auth.json 管理工具（路径在运行时从 Electron 获取）
function backupAuth(authFile: string): { content: string | null } {
  return {
    content: fs.existsSync(authFile)
      ? fs.readFileSync(authFile, "utf-8")
      : null,
  };
}

function restoreAuth(authFile: string, backup: { content: string | null }) {
  if (backup.content !== null) {
    fs.writeFileSync(authFile, backup.content);
  } else if (fs.existsSync(authFile)) {
    fs.unlinkSync(authFile);
  }
}

function writeFakeAuth(authFile: string, token = "test-token-e2e") {
  fs.mkdirSync(path.dirname(authFile), { recursive: true });
  fs.writeFileSync(
    authFile,
    JSON.stringify({
      token,
      user: { id: "test", email: "t@t.com", nickname: "测试", isVerified: true },
      expiresAt: Date.now() + 86400000,
    })
  );
}

// ─── 策略 A：IPC 层 mock ─────────────────────────────────────────
// 在 main 进程替换 session:prompt handler → 直接抛 QUOTA_EXCEEDED
// 验证 renderer 正确展示幽默消息

test.describe("Quota exceeded — IPC mock", () => {
  let app: Awaited<ReturnType<typeof electron.launch>>;
  let page: Awaited<ReturnType<typeof app.firstWindow>>;

  test.setTimeout(60000);

  test.beforeAll(async () => {
    app = await electron.launch({
      args: [path.join(__dirname, "../../.vite/build/main.js")],
      env: proxyFreeEnv(),
    });
    page = await app.firstWindow();
    await page.waitForLoadState("domcontentloaded");

    // 替换 main 进程的 session:prompt handler → 抛 QUOTA_EXCEEDED
    await app.evaluate(async ({ ipcMain }) => {
      ipcMain.removeHandler("session:prompt");
      ipcMain.handle("session:prompt", async () => {
        throw new Error("QUOTA_EXCEEDED");
      });
    });
  });

  test.afterAll(async () => {
    await app.close();
  });

  test("shows humorous quota message when QUOTA_EXCEEDED", async () => {
    const textarea = page.locator("textarea").first();
    await textarea.fill("帮我写一篇论文");
    const sendBtn = page.locator('button[title="发送"]');
    await sendBtn.click();

    // 等待 assistant 气泡出现幽默消息
    const bubble = page.locator(".msg.from-ai .bubble").last();
    await expect(bubble).toContainText("大师兄今天的法力耗尽了", { timeout: 8000 });
    await expect(bubble).toContainText("躺平等待");
    await expect(bubble).toContainText("升级订阅");
    await expect(bubble).toContainText("购买 Token 包");
    await expect(bubble).toContainText("设置 → 订阅管理");
  });

  test("input is re-enabled after quota error", async () => {
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeEnabled({ timeout: 3000 });
  });

  test("normal messages work after restoring handler", async () => {
    // 替换为成功的 handler（不调真实 AI）
    await app.evaluate(async ({ ipcMain }) => {
      ipcMain.removeHandler("session:prompt");
      ipcMain.handle("session:prompt", async () => {
        /* noop */
      });
    });

    const textarea = page.locator("textarea").first();
    await textarea.fill("这条消息应该正常发送");
    const sendBtn = page.locator('button[title="发送"]');
    await sendBtn.click();

    const userMsg = page.locator(".msg.from-user").last();
    await expect(userMsg).toContainText("这条消息应该正常发送", { timeout: 5000 });
  });
});

// ─── 策略 B：Full-stack mock ─────────────────────────────────────
// mock server 返回 freeTokens=0 → main 进程 checkQuota() 拦截 → renderer 显示消息

test.describe("Quota exceeded — full stack", () => {
  let app: Awaited<ReturnType<typeof electron.launch>>;
  let page: Awaited<ReturnType<typeof app.firstWindow>>;
  let mockServer: http.Server;
  let mockPort: number;
  let authFile: string;
  let authBackup: { content: string | null } | undefined;
  const requestLog: string[] = [];

  test.setTimeout(60000);

  test.beforeAll(async () => {
    // 1) 启动 mock server
    mockServer = http.createServer((req, res) => {
      requestLog.push(`${req.method} ${req.url}`);
      res.setHeader("Content-Type", "application/json");

      if (req.url === "/health") {
        res.end(JSON.stringify({ ok: true }));
      } else if (req.url === "/api/billing/balance") {
        res.end(JSON.stringify({ balance: 0, freeTokens: 0 }));
      } else if (req.url?.startsWith("/api/billing/usage")) {
        res.end(JSON.stringify({ success: true }));
      } else if (req.url === "/api/user/me") {
        res.end(JSON.stringify({ id: "test", email: "t@t.com", nickname: "测试", isVerified: true }));
      } else {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: "not found" }));
      }
    });

    await new Promise<void>((resolve) => {
      mockServer.listen(0, "127.0.0.1", () => {
        mockPort = (mockServer.address() as any).port;
        resolve();
      });
    });

    // 2) 启动 Electron（绕过代理，指向 mock server）
    app = await electron.launch({
      args: [path.join(__dirname, "../../.vite/build/main.js")],
      env: proxyFreeEnv({
        DASHIXIONG_API_URL: `http://127.0.0.1:${mockPort}`,
      }),
    });
    page = await app.firstWindow();
    await page.waitForLoadState("domcontentloaded");

    // 3) 从 Electron 获取真实 userData 路径，写 auth.json
    const userDataDir = await app.evaluate(async ({ app: electronApp }) => {
      return electronApp.getPath("userData");
    });
    authFile = path.join(userDataDir, "auth.json");
    authBackup = backupAuth(authFile);
    writeFakeAuth(authFile);
  });

  test.afterAll(async () => {
    await app?.close();
    await new Promise<void>((resolve) => mockServer?.close(() => resolve()));
    if (authFile && authBackup) restoreAuth(authFile, authBackup);
  });

  test("main process blocks prompt and renderer shows quota message", async () => {
    // 等待 session ready
    await page.waitForFunction(
      () => {
        const ta = document.querySelector("textarea");
        return ta && !ta.disabled;
      },
      { timeout: 15000 }
    );

    const textarea = page.locator("textarea").first();
    await textarea.fill("帮我分析这篇论文的创新点");
    const sendBtn = page.locator('button[title="发送"]');
    await sendBtn.click();

    // assistant 气泡应显示额度用完消息
    const bubble = page.locator(".msg.from-ai .bubble").last();
    await expect(bubble).toContainText("大师兄今天的法力耗尽了", { timeout: 10000 });
    await expect(bubble).toContainText("免费 Token 已经用完");
  });

  test("mock server received balance check", async () => {
    expect(requestLog.some((r) => r.includes("/api/billing/balance"))).toBe(true);
  });

  test("input is re-enabled after full-stack quota error", async () => {
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeEnabled({ timeout: 3000 });
  });
});

// ─── 策略 C：服务端不可达 → 优雅降级，不阻断 ────────────────────

test.describe("Quota check — server unreachable graceful degradation", () => {
  let app: Awaited<ReturnType<typeof electron.launch>>;
  let page: Awaited<ReturnType<typeof app.firstWindow>>;
  let authFile: string;
  let authBackup: { content: string | null } | undefined;

  // 第三个 Electron 实例可能启动稍慢
  test.setTimeout(60000);

  test.beforeAll(async () => {
    // 指向不存在的端口 → getBalance() 会 ECONNREFUSED
    app = await electron.launch({
      args: [path.join(__dirname, "../../.vite/build/main.js")],
      env: proxyFreeEnv({
        DASHIXIONG_API_URL: "http://127.0.0.1:19999",
      }),
    });
    page = await app.firstWindow();
    await page.waitForLoadState("domcontentloaded");

    // 从 Electron 获取真实 userData 路径
    const userDataDir = await app.evaluate(async ({ app: electronApp }) => {
      return electronApp.getPath("userData");
    });
    authFile = path.join(userDataDir, "auth.json");
    authBackup = backupAuth(authFile);
    writeFakeAuth(authFile, "test-token-unreachable");
  });

  test.afterAll(async () => {
    await app?.close();
    if (authFile && authBackup) restoreAuth(authFile, authBackup);
  });

  test("does NOT show quota error when server is unreachable", async () => {
    await page.waitForFunction(
      () => {
        const ta = document.querySelector("textarea");
        return ta && !ta.disabled;
      },
      { timeout: 15000 }
    );

    // 替换 session:prompt 为 noop（不调真实 AI，只验证 checkQuota 不阻断）
    await app.evaluate(async ({ ipcMain }) => {
      ipcMain.removeHandler("session:prompt");
      ipcMain.handle("session:prompt", async () => {
        /* noop success */
      });
    });

    const textarea = page.locator("textarea").first();
    await textarea.fill("服务端不可达也不阻断");
    const sendBtn = page.locator('button[title="发送"]');
    await sendBtn.click();

    // 用户消息正常出现
    const userMsg = page.locator(".msg.from-user").last();
    await expect(userMsg).toContainText("服务端不可达也不阻断", { timeout: 5000 });

    // 不应出现额度用完的提示
    const bubbles = page.locator(".msg.from-ai .bubble");
    const count = await bubbles.count();
    for (let i = 0; i < count; i++) {
      const text = await bubbles.nth(i).textContent();
      expect(text).not.toContain("法力耗尽");
    }
  });
});
