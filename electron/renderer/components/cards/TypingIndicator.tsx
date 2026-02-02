import React from "react";
import DashixiongAvatar from "../DashixiongAvatar";
import { useUserStore } from "../../stores/user-store";

export default function TypingIndicator() {
  const { aiName } = useUserStore();

  return (
    <div className="typing">
      <div className="msg-avatar" style={{ marginTop: 2 }}>
        <DashixiongAvatar size={28} />
      </div>
      <div className="typing-body">
        <div className="typing-name">{aiName}</div>
        <div className="typing-bubble">
          <span className="typing-label">正在准备</span>
          <span className="typing-dots">
            <span className="t-dot" />
            <span className="t-dot" />
            <span className="t-dot" />
          </span>
        </div>
      </div>
    </div>
  );
}
