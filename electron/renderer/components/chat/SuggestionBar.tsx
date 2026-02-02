import React, { useMemo } from "react";
import { useSessionStore } from "../../stores/session-store";
import { useSendMessage } from "../../hooks/useSendMessage";
import type { Suggestion } from "../../utils/parseSuggestions";

const WELCOME_SUGGESTIONS: Suggestion[] = [
  { label: "帮我做一次文献检索", sendText: "帮我做一次文献检索" },
  { label: "帮我润色论文段落", sendText: "帮我润色一下论文段落" },
  { label: "帮我设计实验方案", sendText: "帮我设计一个实验方案" },
  { label: "帮我写论文大纲", sendText: "帮我写一个论文大纲" },
];

/**
 * 仅在空聊天时显示欢迎建议。
 * 短默认回复（好的/继续）已移至 InputBar 内部。
 */
export default function SuggestionBar() {
  const messages = useSessionStore((s) => s.messages);
  const sendMessage = useSendMessage();

  if (messages.length !== 0) return null;

  return (
    <div className="suggestion-bar welcome">
      <div className="suggestion-greeting">
        有什么我能帮你的？
      </div>
      <div className="suggestion-pills">
        {WELCOME_SUGGESTIONS.map((s, i) => (
          <button
            key={i}
            className="suggestion-pill"
            onClick={() => sendMessage(s.sendText)}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
