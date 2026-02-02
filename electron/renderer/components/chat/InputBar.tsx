import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Mic, MicOff, ArrowUp, Square, X } from "lucide-react";
import { useSessionStore } from "../../stores/session-store";
import { useUserStore } from "../../stores/user-store";
import { useSendMessage } from "../../hooks/useSendMessage";
import { parseFallbackSuggestions } from "../../utils/parseSuggestions";

export default function InputBar() {
  const [text, setText] = useState("");
  const [isVoiceRecording, setVoiceRecording] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [voiceReady, setVoiceReady] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isComposingRef = useRef(false);
  const messages = useSessionStore((s) => s.messages);
  const isStreaming = useSessionStore((s) => s.isStreaming);
  const pendingDecision = useSessionStore((s) => s.pendingDecision);
  const setPendingDecision = useSessionStore((s) => s.setPendingDecision);
  const markDecisionAnswered = useSessionStore((s) => s.markDecisionAnswered);
  const { aiName } = useUserStore();
  const sendMessage = useSendMessage();

  // When entering decision reply mode, auto-focus the input
  useEffect(() => {
    if (pendingDecision) {
      textareaRef.current?.focus();
    }
  }, [pendingDecision]);

  // 快捷回复 chips（好的/继续/详细说说）
  // 当有未回答的 DecisionCard 时不显示（用户应通过 DecisionCard 交互）
  const quickChips = useMemo(() => {
    if (messages.length === 0 || isStreaming || text.trim()) return [];

    // Check if any message has an unanswered decision — if so, hide chips
    const hasPendingDecision = messages.some((msg) =>
      msg.blocks.some((b) => b.type === "decision" && !b.answered)
    );
    if (hasPendingDecision) return [];

    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === "assistant") {
        const t = msg.blocks
          .filter((b) => b.type === "text" && b.text)
          .map((b) => b.text!)
          .join("\n");
        return parseFallbackSuggestions(t, false);
      }
    }
    return [];
  }, [messages, isStreaming, text]);

  // Check voice availability on mount
  useEffect(() => {
    window.api.voiceAvailable().then(setVoiceReady).catch(() => setVoiceReady(false));
  }, []);

  // Subscribe to voice events
  useEffect(() => {
    const unsubs = [
      window.api.onVoiceInterim((interim) => {
        setInterimText(interim);
      }),
      window.api.onVoiceCompleted((completed) => {
        setText((prev) => prev + completed);
        setInterimText("");
      }),
      window.api.onVoiceError((error) => {
        console.error("[voice]", error);
        setVoiceRecording(false);
        setInterimText("");
      }),
    ];
    return () => unsubs.forEach((fn) => fn());
  }, []);

  const handleVoiceToggle = useCallback(async () => {
    if (isVoiceRecording) {
      // Stop recording
      await window.api.voiceStop();
      setVoiceRecording(false);
      setInterimText("");
      // Focus textarea so user can edit/send
      textareaRef.current?.focus();
    } else {
      // Start recording
      const result = await window.api.voiceStart();
      if (result.ok) {
        setVoiceRecording(true);
        setInterimText("");
      } else {
        console.error("[voice] Failed to start:", result.error);
      }
    }
  }, [isVoiceRecording]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Block normal sends while streaming (but allow decision replies)
    if (isStreaming && !pendingDecision) return;

    // If recording, stop first
    if (isVoiceRecording) {
      window.api.voiceCancel();
      setVoiceRecording(false);
      setInterimText("");
    }

    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Decision reply mode: respond to the pending decision via InputBar
    if (pendingDecision) {
      const { toolCallId } = pendingDecision;
      markDecisionAnswered(toolCallId, -1, trimmed);
      setPendingDecision(null);
      try {
        await window.api.respondDecision(toolCallId, trimmed);
      } catch (err) {
        console.error("Failed to respond to decision:", err);
      }
      return;
    }

    await sendMessage(trimmed);
  }, [text, isStreaming, isVoiceRecording, sendMessage, pendingDecision, markDecisionAnswered, setPendingDecision]);

  const handleAbort = useCallback(() => {
    window.api.abort();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && !isComposingRef.current && !e.nativeEvent.isComposing) {
        e.preventDefault();
        // Allow Enter during streaming only when replying to a decision
        if (isStreaming && !pendingDecision) return;
        handleSend();
      }
    },
    [handleSend, isStreaming, pendingDecision]
  );

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, []);

  // Input is enabled when not streaming, OR when replying to a decision
  const inputEnabled = !isStreaming || !!pendingDecision;

  const handleCancelDecision = useCallback(() => {
    setPendingDecision(null);
  }, [setPendingDecision]);

  return (
    <div className="input-area">
      {pendingDecision && (
        <div className="decision-reply-hint">
          <span className="decision-reply-label">回复：</span>
          <span className="decision-reply-question">{pendingDecision.question}</span>
          <button className="decision-reply-cancel" onClick={handleCancelDecision} title="取消">
            <X size={12} />
          </button>
        </div>
      )}
      <div className={`input-box ${isVoiceRecording ? "recording" : ""} ${pendingDecision ? "decision-mode" : ""}`}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => { isComposingRef.current = true; }}
          onCompositionEnd={() => { isComposingRef.current = false; }}
          placeholder={
            isVoiceRecording
              ? "正在听..."
              : pendingDecision
                ? "输入你的回复..."
                : `和${aiName}说点什么...`
          }
          rows={1}
          disabled={!inputEnabled}
        />
        {interimText && (
          <div className="voice-interim">{interimText}</div>
        )}
        {/* 快捷回复 chips — 输入框内右侧 */}
        {quickChips.length > 0 && !pendingDecision && (
          <div className="quick-chips">
            {quickChips.map((c, i) => (
              <button
                key={i}
                className="quick-chip"
                onClick={() => sendMessage(c.sendText)}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
        <div className="input-btns">
          {voiceReady && (
            <button
              className={`circle-btn mic ${isVoiceRecording ? "active" : ""}`}
              title={isVoiceRecording ? "停止录音" : "语音输入"}
              onClick={handleVoiceToggle}
              disabled={!inputEnabled}
            >
              {isVoiceRecording ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          )}
          {isStreaming && !pendingDecision ? (
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
      <div className="input-hint">Enter 发送 · Shift+Enter 换行{voiceReady ? " · 点击麦克风语音输入" : ""}</div>
    </div>
  );
}
