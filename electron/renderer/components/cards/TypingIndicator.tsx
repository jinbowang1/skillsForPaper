import React from "react";
import { GraduationCap } from "lucide-react";

export default function TypingIndicator() {
  return (
    <div className="typing">
      <div className="msg-avatar">
        <GraduationCap size={14} color="white" />
      </div>
      <div className="typing-bubble">
        <div className="t-dot" />
        <div className="t-dot" />
        <div className="t-dot" />
      </div>
    </div>
  );
}
