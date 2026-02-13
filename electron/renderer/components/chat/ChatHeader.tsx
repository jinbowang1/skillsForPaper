import React, { useCallback } from "react";
import { useSessionStore } from "../../stores/session-store";
import { useUserStore } from "../../stores/user-store";
import { useToastStore } from "../../stores/toast-store";
import DashixiongAvatar from "../DashixiongAvatar";
import WindowControls from "./WindowControls";

export default function ChatHeader() {
  const { isStreaming, statusPhrase } = useSessionStore();
  const { aiName } = useUserStore();
  const addToast = useToastStore((s) => s.addToast);
  const clearMessages = useSessionStore((state) => state.clearMessages);

  const handleNewChat = useCallback(async () => {
    const confirmed = window.confirm(
      "确定要开始新对话吗？\n\n" +
      "• 当前对话记录将被清空\n" +
      "• 你的个人信息和记忆不会丢失"
    );
    if (!confirmed) return;

    try {
      clearMessages();
      await window.api.clearChatHistory();
      await window.api.newSession();
      addToast("已开始新对话");
    } catch (err) {
      addToast("开始新对话失败");
      console.error("[ChatHeader] Failed to start new chat:", err);
    }
  }, [clearMessages, addToast]);

  return (
    <div className="chat-header">
      <div className="chat-header-center">
        <DashixiongAvatar size={28} />
        <div>
          <div className="chat-header-name">{aiName}</div>
          <div className="chat-header-status">
            <span className={`status-dot ${isStreaming ? "thinking" : "idle"}`} />
            {statusPhrase}
          </div>
        </div>
      </div>
      <div className="chat-header-right">
        <button
          className="new-chat-btn"
          onClick={handleNewChat}
          disabled={isStreaming}
          title="开始新对话"
        >
          新建对话
        </button>
      </div>
      <WindowControls />
    </div>
  );
}
