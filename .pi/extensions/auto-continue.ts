/**
 * auto-continue — 长任务自动续跑
 *
 * 监听 agent_end 事件，检查 output/TASK.md 是否有未完成项。
 * 如果有，等几秒后自动发一条消息催大师兄继续干活。
 *
 * 安全机制：
 * - 连续自动续跑上限 MAX_AUTO_CONTINUES 次
 * - 用户手动发消息后重置计数
 * - 进度无变化连续 2 次则停止（模型卡住了）
 * - 模型主动暂停等用户输入时不催
 * - 每次续跑前等待 DELAY_MS 毫秒
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { readFileSync, existsSync } from "fs";
import path from "path";

const MAX_AUTO_CONTINUES = 15;
const DELAY_MS = 3000;
const MAX_STALL_COUNT = 2;

export default function autoContinue(pi: ExtensionAPI) {
  let autoCount = 0;
  let lastUnchecked = -1;
  let stallCount = 0;

  // 用户手动输入时重置所有计数
  pi.on("input", async () => {
    autoCount = 0;
    lastUnchecked = -1;
    stallCount = 0;
  });

  pi.on("agent_end", async (event, ctx) => {
    // 防无限循环
    if (autoCount >= MAX_AUTO_CONTINUES) {
      return;
    }

    // 检查模型最后一条消息：如果是主动停止且在等用户回复，不续跑
    const messages = event.messages;
    if (messages.length > 0) {
      const last = messages[messages.length - 1];
      if ("role" in last && last.role === "assistant" && "stopReason" in last) {
        // 模型主动结束（不是 token 用完）
        if (last.stopReason === "stop") {
          // 提取文本内容，检查是否在等用户
          const textParts = Array.isArray(last.content)
            ? last.content
                .filter((c: any) => c.type === "text")
                .map((c: any) => c.text)
                .join("")
            : "";
          const lastLine = textParts.trim().split("\n").pop() || "";
          // 以问号结尾、或包含明确等待用户的关键词
          if (
            lastLine.endsWith("?") ||
            lastLine.endsWith("？") ||
            /请(你)?(提供|给我|确认|选择|告诉|说明)/.test(lastLine) ||
            /需要你/.test(lastLine)
          ) {
            return;
          }
        }
      }
    }

    const taskFile = path.join(ctx.cwd, "output", "TASK.md");
    if (!existsSync(taskFile)) {
      return;
    }

    let content: string;
    try {
      content = readFileSync(taskFile, "utf-8");
    } catch {
      return;
    }

    // 已完成的任务不续跑
    if (content.includes("## 状态：已完成")) {
      return;
    }

    // 数未完成项
    const unchecked = (content.match(/- \[ \]/g) || []).length;
    const checked = (content.match(/- \[x\]/gi) || []).length;

    if (unchecked === 0) {
      return;
    }

    // 检测进度停滞：如果未完成数和上次一样，说明模型没推进
    if (unchecked === lastUnchecked) {
      stallCount++;
      if (stallCount >= MAX_STALL_COUNT) {
        return; // 连续卡住，不再催了
      }
    } else {
      stallCount = 0;
    }
    lastUnchecked = unchecked;

    autoCount++;

    // 等几秒再催，避免疯狂轮转
    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));

    pi.sendUserMessage(
      `[自动续跑 ${autoCount}/${MAX_AUTO_CONTINUES}] TASK.md 还有 ${unchecked} 项未完成（已完成 ${checked} 项）。继续。`,
      { deliverAs: "followUp" },
    );
  });
}
