import React, { useState, useRef, useCallback } from "react";
import { Mic, ArrowUp, Square } from "lucide-react";
import { useSessionStore, generateMsgId } from "../../stores/session-store";

export default function InputBar() {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isComposingRef = useRef(false);
  const { isStreaming, addMessage, setStreaming, updateLastAssistantMessage } = useSessionStore();

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    // Add user message to store
    addMessage({
      id: generateMsgId(),
      role: "user",
      blocks: [{ type: "text", text: trimmed }],
      timestamp: Date.now(),
    });

    // Pre-create assistant message so events always have a target,
    // even if agent_start doesn't fire reliably for subsequent prompts
    addMessage({
      id: generateMsgId(),
      role: "assistant",
      blocks: [],
      timestamp: Date.now(),
      isStreaming: true,
    });

    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Send to main process
    try {
      await window.api.prompt(trimmed);
    } catch (err) {
      console.error("Failed to send prompt:", err);
      // Reset stuck streaming state so user can retry
      setStreaming(false);
      updateLastAssistantMessage((blocks) => {
        if (blocks.length === 0) {
          return [{ type: "text", text: "⚠ 发送失败，请重试" }];
        }
        return blocks;
      });
      // Clear isStreaming on the message
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
  }, [text, isStreaming, addMessage, setStreaming, updateLastAssistantMessage]);

  const handleAbort = useCallback(() => {
    window.api.abort();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Don't send during IME composition (e.g. Chinese input confirming English word)
      if (e.key === "Enter" && !e.shiftKey && !isComposingRef.current && !e.nativeEvent.isComposing) {
        e.preventDefault();
        if (isStreaming) return;
        handleSend();
      }
    },
    [handleSend, isStreaming]
  );

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    // Auto-resize
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, []);

  return (
    <div className="input-area">
      <div className="input-box">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => { isComposingRef.current = true; }}
          onCompositionEnd={() => { isComposingRef.current = false; }}
          placeholder="和大师兄说点什么..."
          rows={1}
          disabled={isStreaming}
        />
        <div className="input-btns">
          <button className="circle-btn mic" title="语音输入">
            <Mic size={16} />
          </button>
          {isStreaming ? (
            <button
              className="circle-btn send"
              onClick={handleAbort}
              title="停止"
              style={{ background: "var(--red)" }}
            >
              <Square size={14} />
            </button>
          ) : (
            <button
              className="circle-btn send"
              onClick={handleSend}
              disabled={!text.trim()}
              title="发送"
            >
              <ArrowUp size={16} />
            </button>
          )}
        </div>
      </div>
      <div className="input-hint">Enter 发送 · Shift+Enter 换行</div>
    </div>
  );
}
