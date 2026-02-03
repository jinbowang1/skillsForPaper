import { useCallback, useRef } from "react";
import { useSessionStore, generateMsgId } from "../stores/session-store";
import { useToastStore } from "../stores/toast-store";
import type { ContentBlock } from "../stores/session-store";

export interface ImageAttachment {
  data: string;      // base64 (no data-url prefix)
  mimeType: string;  // e.g. "image/png"
}

// Track whether we've shown the limit warning this session
let limitWarningShown = false;

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

      // Check usage limit (non-blocking warning)
      try {
        const limit = await window.api.checkUsageLimit();
        if (limit.isAtLimit) {
          showToast(`今日用量已达上限 (${limit.dailyLimitCny}元)，请明日再试`, "error");
          return;
        }
        if (limit.isNearLimit && !limitWarningShown) {
          limitWarningShown = true;
          showToast(`今日用量已达 ${limit.percentUsed.toFixed(0)}%，请注意控制`, "info");
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
