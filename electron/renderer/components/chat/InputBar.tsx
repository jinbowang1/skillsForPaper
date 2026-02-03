import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { Mic, MicOff, ArrowUp, Square, X, ImagePlus } from "lucide-react";
import { useSessionStore } from "../../stores/session-store";
import { useUserStore } from "../../stores/user-store";
import { useToastStore } from "../../stores/toast-store";
import { useSendMessage, type ImageAttachment } from "../../hooks/useSendMessage";
import { parseFallbackSuggestions } from "../../utils/parseSuggestions";
import { THINKING_PHRASES, pickRandom } from "../../utils/status-phrases";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20 MB
const MAX_IMAGE_SIZE_MB = 20;

function readFileAsBase64(file: File): Promise<ImageAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Strip the "data:image/png;base64," prefix
      const base64 = dataUrl.split(",")[1] || "";
      resolve({ data: base64, mimeType: file.type });
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export default function InputBar() {
  const [text, setText] = useState("");
  const [images, setImages] = useState<Array<ImageAttachment & { preview: string }>>([]);
  const [isVoiceRecording, setVoiceRecording] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [voiceReady, setVoiceReady] = useState(false);
  const [statusPhrase, setStatusPhrase] = useState(() => pickRandom(THINKING_PHRASES));
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isComposingRef = useRef(false);
  const messages = useSessionStore((s) => s.messages);
  const isStreaming = useSessionStore((s) => s.isStreaming);
  const pendingDecision = useSessionStore((s) => s.pendingDecision);
  const setPendingDecision = useSessionStore((s) => s.setPendingDecision);
  const markDecisionAnswered = useSessionStore((s) => s.markDecisionAnswered);
  const currentModelSupportsImages = useSessionStore((s) => s.currentModelSupportsImages);
  const { aiName } = useUserStore();
  const addToast = useToastStore((s) => s.addToast);
  const sendMessage = useSendMessage();

  // Pick a new status phrase when streaming starts
  useEffect(() => {
    if (isStreaming) {
      setStatusPhrase(pickRandom(THINKING_PHRASES, statusPhrase));
    }
  }, [isStreaming]);

  // Clear staged images when switching to a text-only model
  useEffect(() => {
    if (!currentModelSupportsImages && images.length > 0) {
      images.forEach((img) => URL.revokeObjectURL(img.preview));
      setImages([]);
    }
  }, [currentModelSupportsImages]);

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
      window.api.onVoiceError((errorType?: string) => {
        const msg = errorType === "permission"
          ? "麦克风权限被拒绝，请在系统设置中允许"
          : errorType === "network"
            ? "语音服务连接失败，请检查网络"
            : "语音识别出错，请重试";
        addToast(msg);
        setVoiceRecording(false);
        setInterimText("");
      }),
    ];
    return () => unsubs.forEach((fn) => fn());
  }, [addToast]);

  // Handle files (from file input, paste, or drag-and-drop)
  const addImageFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    let hasInvalidType = false;
    let hasOversized = false;

    for (const f of fileArray) {
      if (!ACCEPTED_TYPES.includes(f.type)) {
        hasInvalidType = true;
        continue;
      }
      if (f.size > MAX_IMAGE_SIZE) {
        hasOversized = true;
        continue;
      }
      validFiles.push(f);
    }

    // Show specific error messages
    if (hasInvalidType) {
      addToast("不支持该图片格式，请使用 PNG/JPEG/WebP/GIF");
    }
    if (hasOversized) {
      addToast(`图片过大，请选择小于 ${MAX_IMAGE_SIZE_MB}MB 的图片`);
    }

    if (validFiles.length === 0) return;

    try {
      const newImages = await Promise.all(
        validFiles.map(async (f) => {
          const attachment = await readFileAsBase64(f);
          return {
            ...attachment,
            preview: URL.createObjectURL(f),
          };
        })
      );
      setImages((prev) => [...prev, ...newImages]);
    } catch {
      addToast("图片读取失败，请重试");
    }
  }, [addToast]);

  // Paste handler: intercept image paste (only when model supports images)
  useEffect(() => {
    if (!currentModelSupportsImages) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (const item of items) {
        if (item.kind === "file" && ACCEPTED_TYPES.includes(item.type)) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        addImageFiles(imageFiles);
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [addImageFiles, currentModelSupportsImages]);

  const removeImage = useCallback((index: number) => {
    setImages((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleVoiceToggle = useCallback(async () => {
    try {
      if (isVoiceRecording) {
        await window.api.voiceStop();
        setVoiceRecording(false);
        setInterimText("");
        textareaRef.current?.focus();
      } else {
        const result = await window.api.voiceStart();
        if (result.ok) {
          setVoiceRecording(true);
          setInterimText("");
        } else {
          addToast("语音输入启动失败，请检查麦克风权限");
        }
      }
    } catch {
      addToast("语音输入出错，请重试");
      setVoiceRecording(false);
      setInterimText("");
    }
  }, [isVoiceRecording, addToast]);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed && images.length === 0) return;

    // Block normal sends while streaming (but allow decision replies)
    if (isStreaming && !pendingDecision) return;

    // If recording, stop first
    if (isVoiceRecording) {
      window.api.voiceCancel();
      setVoiceRecording(false);
      setInterimText("");
    }

    // Capture images before clearing state
    const currentImages = images.length > 0
      ? images.map(({ data, mimeType }) => ({ data, mimeType }))
      : undefined;

    setText("");
    // Revoke object URLs and clear images
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages([]);
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
      } catch {
        addToast("回复发送失败，请重试");
      }
      return;
    }

    // Send text (use a space if user only sends images without text)
    const msgText = trimmed || "请分析这张图片";
    await sendMessage(msgText, currentImages);
  }, [text, images, isStreaming, isVoiceRecording, sendMessage, pendingDecision, markDecisionAnswered, setPendingDecision]);

  const handleAbort = useCallback(async () => {
    try {
      await window.api.abort();
    } catch (err) {
      console.error("Abort failed:", err);
    }
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

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addImageFiles(e.target.files);
    }
    // Reset so the same file can be selected again
    e.target.value = "";
  }, [addImageFiles]);

  // Drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentModelSupportsImages && e.dataTransfer.files) {
      addImageFiles(e.dataTransfer.files);
    }
  }, [addImageFiles, currentModelSupportsImages]);

  // Input is enabled when not streaming, OR when replying to a decision
  const inputEnabled = !isStreaming || !!pendingDecision;

  const handleCancelDecision = useCallback(() => {
    setPendingDecision(null);
  }, [setPendingDecision]);

  return (
    <div className="input-area" onDragOver={handleDragOver} onDrop={handleDrop}>
      {pendingDecision && (
        <div className="decision-reply-hint">
          <span className="decision-reply-label">回复：</span>
          <span className="decision-reply-question">{pendingDecision.question}</span>
          <button className="decision-reply-cancel" onClick={handleCancelDecision} title="取消">
            <X size={12} />
          </button>
        </div>
      )}
      {/* Image preview strip */}
      {images.length > 0 && (
        <div className="image-preview-strip">
          {images.map((img, i) => (
            <div key={i} className="image-preview-item">
              <img src={img.preview} alt="" className="image-preview-thumb" />
              <button className="image-preview-remove" onClick={() => removeImage(i)}>
                <X size={10} />
              </button>
            </div>
          ))}
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
                : isStreaming
                  ? `${aiName}${statusPhrase}`
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
          {/* Image upload button — only when current model supports images */}
          {currentModelSupportsImages && (
            <>
              <button
                className="circle-btn attach"
                title="上传图片"
                onClick={() => fileInputRef.current?.click()}
                disabled={!inputEnabled || !!pendingDecision}
              >
                <ImagePlus size={16} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                style={{ display: "none" }}
                onChange={handleFileSelect}
              />
            </>
          )}
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
              disabled={!text.trim() && images.length === 0}
              title="发送"
            >
              <ArrowUp size={16} />
            </button>
          )}
        </div>
      </div>
      <div className="input-hint">Enter 发送 · Shift+Enter 换行{voiceReady ? " · 点击麦克风语音输入" : ""}{currentModelSupportsImages ? " · 可粘贴/拖拽图片" : ""}</div>
    </div>
  );
}
