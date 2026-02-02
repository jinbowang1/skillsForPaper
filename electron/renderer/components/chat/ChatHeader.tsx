import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSessionStore } from "../../stores/session-store";
import { useUserStore } from "../../stores/user-store";
import DashixiongAvatar from "../DashixiongAvatar";
import {
  THINKING_PHRASES,
  IDLE_PHRASES,
  pickRandom,
} from "../../utils/status-phrases";

interface ModelInfo {
  id: string;
  name: string;
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
  const statusText = useStatusPhrase(isStreaming);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [isOpen, setOpen] = useState(false);
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
    async (modelId: string) => {
      setOpen(false);
      try {
        const { model } = await window.api.setModel(modelId);
        setModel(model);
      } catch (err) {
        console.error("Failed to set model:", err);
      }
    },
    [setModel]
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
          className="model-pill"
          onClick={() => setOpen((o) => !o)}
        >
          {currentModel} &#9662;
        </button>
        {isOpen && models.length > 0 && (
          <div className="model-dropdown">
            {models.map((m) => (
              <button
                key={m.id}
                className={`model-option${m.name === currentModel ? " active" : ""}`}
                onClick={() => handleSelect(m.id)}
              >
                {m.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
