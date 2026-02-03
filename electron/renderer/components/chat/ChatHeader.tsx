import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSessionStore } from "../../stores/session-store";
import { useUserStore } from "../../stores/user-store";
import { useToastStore } from "../../stores/toast-store";
import DashixiongAvatar from "../DashixiongAvatar";
import WindowControls from "./WindowControls";
import {
  THINKING_PHRASES,
  IDLE_PHRASES,
  pickRandom,
} from "../../utils/status-phrases";

interface ModelInfo {
  id: string;
  name: string;
  needsVpn?: boolean;
}

/** Pick ONE random phrase per streaming state change (no rotation) */
function useStatusPhrase(isStreaming: boolean): string {
  const [phrase, setPhrase] = useState(() => pickRandom(IDLE_PHRASES));

  useEffect(() => {
    setPhrase(pickRandom(isStreaming ? THINKING_PHRASES : IDLE_PHRASES));
  }, [isStreaming]);

  return phrase;
}

export default function ChatHeader() {
  const { isStreaming, currentModel, setModel } = useSessionStore();
  const { aiName } = useUserStore();
  const addToast = useToastStore((s) => s.addToast);
  const statusText = useStatusPhrase(isStreaming);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [isOpen, setOpen] = useState(false);
  const [isSwitching, setSwitching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fetch models lazily when dropdown opens (session may not be ready on mount)
  useEffect(() => {
    if (isOpen && models.length === 0) {
      window.api.getModels().then(setModels).catch(() => {});
    }
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  const handleSelect = useCallback(
    async (m: ModelInfo) => {
      if (m.needsVpn) {
        const ok = window.confirm(
          "Claude Opus 4.5 需要科学上网（VPN）才能使用。\n如果你没有开启 VPN，切换后将无法正常对话。\n\n确定切换吗？"
        );
        if (!ok) return;
      }
      setOpen(false);
      setSwitching(true);
      try {
        const previousModel = currentModel;
        const { model } = await window.api.setModel(m.id);
        setModel(model);
        // Track model switching
        window.api.trackFeature("model", "switch", { from: previousModel, to: model }).catch(() => {});
      } catch {
        addToast("模型切换失败，请检查网络连接");
      } finally {
        setSwitching(false);
      }
    },
    [setModel, addToast, currentModel]
  );

  return (
    <div className="chat-header">
      <div className="chat-header-center">
        <DashixiongAvatar size={28} />
        <div>
          <div className="chat-header-name">{aiName}</div>
          <div className="chat-header-status">
            <span className="online-dot" />
            {statusText}
          </div>
        </div>
      </div>
      <div className="model-selector" ref={ref}>
        <button
          className={`model-pill ${isSwitching ? "loading" : ""}`}
          onClick={() => !isSwitching && !isStreaming && setOpen((o) => !o)}
          disabled={isSwitching || isStreaming}
        >
          {isSwitching ? "切换中..." : currentModel} {!isSwitching && <>&#9662;</>}
        </button>
        {isOpen && models.length > 0 && (
          <div className="model-dropdown">
            {models.map((m) => (
              <button
                key={m.id}
                className={`model-option${m.name === currentModel ? " active" : ""}`}
                onClick={() => handleSelect(m)}
              >
                {m.name}
                {m.needsVpn && <span className="vpn-tag">需VPN</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      <WindowControls />
    </div>
  );
}
