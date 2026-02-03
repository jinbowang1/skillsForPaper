import React, { useMemo } from "react";
import { useSessionStore } from "../../stores/session-store";
import { useSendMessage } from "../../hooks/useSendMessage";
import type { Suggestion } from "../../utils/parseSuggestions";

const WELCOME_SUGGESTIONS: Suggestion[] = [
  { label: "创新点挖掘",       sendText: "帮我进行创新点挖掘" },
  { label: "实验设计",         sendText: "帮我进行实验设计" },
  { label: "代码编写与执行",   sendText: "帮我进行代码编写与执行" },
  { label: "智能润色",         sendText: "帮我进行智能润色" },
  { label: "生成目标期刊pdf",  sendText: "帮我生成目标期刊pdf" },
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
      <div className="suggestion-hint">
        点击下方按钮快速开始，或在输入框输入你的问题
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
