import React from "react";
import { useSessionStore } from "../../stores/session-store";
import { useAutoScroll } from "../../hooks/useAutoScroll";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "../cards/TypingIndicator";

export default function MessageList() {
  const { messages, isStreaming } = useSessionStore();
  const { containerRef } = useAutoScroll([messages]);

  const isEmpty = messages.length === 0;

  return (
    <div
      className={`messages${isEmpty ? " empty" : ""}`}
      ref={containerRef}
    >
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {isStreaming && messages.length > 0 && !messages[messages.length - 1]?.isStreaming && (
        <TypingIndicator />
      )}
    </div>
  );
}
