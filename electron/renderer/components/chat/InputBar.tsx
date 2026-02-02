import React, { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, ArrowUp, Square } from "lucide-react";
import { useSessionStore, generateMsgId } from "../../stores/session-store";
import { useUserStore } from "../../stores/user-store";

export default function InputBar() {
  const [text, setText] = useState("");
  const [isVoiceRecording, setVoiceRecording] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [voiceReady, setVoiceReady] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isComposingRef = useRef(false);
  const { isStreaming, addMessage, setStreaming, updateLastAssistantMessage } = useSessionStore();
  const { aiName } = useUserStore();

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
    if (!trimmed || isStreaming) return;

    // If recording, stop first
    if (isVoiceRecording) {
      window.api.voiceCancel();
      setVoiceRecording(false);
      setInterimText("");
    }

    // Add user message to store
    addMessage({
      id: generateMsgId(),
      role: "user",
      blocks: [{ type: "text", text: trimmed }],
      timestamp: Date.now(),
    });

    // Pre-create assistant message so events always have a target
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
      setStreaming(false);
      updateLastAssistantMessage((blocks) => {
        if (blocks.length === 0) {
          return [{ type: "text", text: "\u26A0 发送失败，请重试" }];
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
  }, [text, isStreaming, isVoiceRecording, addMessage, setStreaming, updateLastAssistantMessage]);

  const handleAbort = useCallback(() => {
    window.api.abort();
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
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
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, []);

  return (
    <div className="input-area">
      <div className={`input-box ${isVoiceRecording ? "recording" : ""}`}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => { isComposingRef.current = true; }}
          onCompositionEnd={() => { isComposingRef.current = false; }}
          placeholder={isVoiceRecording ? "正在听..." : `和${aiName}说点什么...`}
          rows={1}
          disabled={isStreaming}
        />
        {interimText && (
          <div className="voice-interim">{interimText}</div>
        )}
        <div className="input-btns">
          {voiceReady && (
            <button
              className={`circle-btn mic ${isVoiceRecording ? "active" : ""}`}
              title={isVoiceRecording ? "停止录音" : "语音输入"}
              onClick={handleVoiceToggle}
              disabled={isStreaming}
            >
              {isVoiceRecording ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          )}
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
      <div className="input-hint">Enter 发送 · Shift+Enter 换行{voiceReady ? " · 点击麦克风语音输入" : ""}</div>
    </div>
  );
}
