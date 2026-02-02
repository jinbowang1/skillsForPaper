import { useCallback } from "react";
import { useSessionStore, generateMsgId } from "../stores/session-store";

/**
 * 共享的消息发送逻辑，InputBar 和 SuggestionBar 共用。
 */
export function useSendMessage(): (text: string) => Promise<void> {
  const { addMessage, setStreaming, updateLastAssistantMessage, isStreaming } =
    useSessionStore();

  return useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      // 添加用户消息
      addMessage({
        id: generateMsgId(),
        role: "user",
        blocks: [{ type: "text", text: trimmed }],
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
        await window.api.prompt(trimmed);
      } catch (err) {
        console.error("Failed to send prompt:", err);
        setStreaming(false);
        updateLastAssistantMessage((blocks) => {
          if (blocks.length === 0) {
            return [{ type: "text", text: "⚠ 发送失败，请重试" }];
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
    [isStreaming, addMessage, setStreaming, updateLastAssistantMessage]
  );
}
