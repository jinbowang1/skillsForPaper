import { useCallback, useRef } from "react";
import { useSessionStore, generateMsgId } from "../stores/session-store";
import { useToastStore } from "../stores/toast-store";
import type { ContentBlock } from "../stores/session-store";

export interface ImageAttachment {
  data: string;      // base64 (no data-url prefix)
  mimeType: string;  // e.g. "image/png"
}

// Track milestones we've celebrated (every 100 CNY)
let lastCelebratedMilestone = 0;

/**
 * 共享的消息发送逻辑，InputBar 和 SuggestionBar 共用。
 */
export function useSendMessage(): (text: string, images?: ImageAttachment[]) => Promise<void> {
  const { addMessage, setStreaming, updateLastAssistantMessage, isStreaming } =
    useSessionStore();
  const showToast = useToastStore((s) => s.show);

  return useCallback(
    async (text: string, images?: ImageAttachment[]) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      // Track feature usage
      try {
        await window.api.trackFeature("chat", "send_message", {
          hasImages: images && images.length > 0,
          textLength: trimmed.length,
        });
      } catch {}

      // Celebrate usage milestones (every 100 CNY, but don't show amounts)
      try {
        const limit = await window.api.checkUsageLimit();
        const currentMilestone = Math.floor(limit.currentUsageCny / 100) * 100;
        if (currentMilestone > 0 && currentMilestone > lastCelebratedMilestone) {
          lastCelebratedMilestone = currentMilestone;
          const milestoneNum = currentMilestone / 100;
          const messages = [
            "恭喜达成今日第 1 个里程碑！你是真正的科研达人！",
            "厉害！第 2 个里程碑达成，大师兄为你骄傲！",
            "太棒了！第 3 个里程碑解锁，继续加油！",
            "了不起！第 4 个里程碑！研究进展神速！",
            "超级用户！第 5 个里程碑达成！感谢支持内测！",
          ];
          const msg = milestoneNum <= 5
            ? messages[milestoneNum - 1]
            : `太强了！今日第 ${milestoneNum} 个里程碑！你是内测之星！`;
          showToast(msg, "success");
        }
      } catch {}

      // Build user message blocks
      const blocks: ContentBlock[] = [];

      // Image blocks first so they appear above text
      if (images && images.length > 0) {
        for (const img of images) {
          blocks.push({
            type: "image",
            imageData: img.data,
            imageMimeType: img.mimeType,
          });
        }
      }

      blocks.push({ type: "text", text: trimmed });

      // 添加用户消息
      addMessage({
        id: generateMsgId(),
        role: "user",
        blocks,
        timestamp: Date.now(),
      });

      // 预创建 assistant 消息，确保流式事件有目标
      addMessage({
        id: generateMsgId(),
        role: "assistant",
        blocks: [],
        timestamp: Date.now(),
        isStreaming: true,
      });

      // 发送给主进程
      try {
        const apiImages = images && images.length > 0
          ? images.map((i) => ({ data: i.data, mimeType: i.mimeType }))
          : undefined;
        await window.api.prompt(trimmed, apiImages);
      } catch (err: any) {
        console.error("Failed to send prompt:", err);
        setStreaming(false);

        // Determine error type for user-friendly message
        const errMsg = err?.message?.toLowerCase() || "";
        let userMessage = "⚠ 发送失败，请重试";
        if (errMsg.includes("timeout") || errMsg.includes("timed out")) {
          userMessage = "⚠ 请求超时，请检查网络后重试";
        } else if (errMsg.includes("network") || errMsg.includes("fetch") || errMsg.includes("econnrefused")) {
          userMessage = "⚠ 网络连接失败，请检查网络设置";
        } else if (errMsg.includes("api key") || errMsg.includes("unauthorized") || errMsg.includes("401")) {
          userMessage = "⚠ API 密钥无效，请检查配置";
        } else if (errMsg.includes("rate limit") || errMsg.includes("429")) {
          userMessage = "⚠ 请求过于频繁，请稍后再试";
        } else if (errMsg.includes("vpn") || errMsg.includes("proxy")) {
          userMessage = "⚠ 无法连接到服务，可能需要开启 VPN";
        } else if (errMsg.includes("quota_exceeded")) {
          userMessage = [
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

        updateLastAssistantMessage((blocks) => {
          if (blocks.length === 0) {
            return [{ type: "text", text: userMessage }];
          }
          return blocks;
        });
        const msgs = useSessionStore.getState().messages;
        for (let i = msgs.length - 1; i >= 0; i--) {
          if (msgs[i].role === "assistant" && msgs[i].isStreaming) {
            useSessionStore.setState({
              messages: msgs.map((m, idx) =>
                idx === i ? { ...m, isStreaming: false } : m
              ),
            });
            break;
          }
        }
      }
    },
    [isStreaming, addMessage, setStreaming, updateLastAssistantMessage, showToast]
  );
}
