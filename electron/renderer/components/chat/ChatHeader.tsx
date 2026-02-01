import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSessionStore } from "../../stores/session-store";
import DashixiongAvatar from "../DashixiongAvatar";

interface ModelInfo {
  id: string;
  name: string;
}

export default function ChatHeader() {
  const { isStreaming, currentModel, setModel } = useSessionStore();
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
          <div className="chat-header-name">大师兄</div>
          <div className="chat-header-status">
            <span className="online-dot" />
            {isStreaming ? "思考中..." : "在线"}
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
