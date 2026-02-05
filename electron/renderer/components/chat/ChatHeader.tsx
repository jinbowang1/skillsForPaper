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
  const [isLoadingModels, setLoadingModels] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fetch models lazily when dropdown opens (session may not be ready on mount)
  useEffect(() => {
    if (isOpen && models.length === 0 && !isLoadingModels) {
      setLoadingModels(true);
      window.api.getModels()
        .then(setModels)
        .catch(() => {})
        .finally(() => setLoadingModels(false));
    }
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, isLoadingModels]);

  const handleSelect = useCallback(
    async (m: ModelInfo) => {
      if (m.needsVpn) {
        const ok = window.confirm(
          "⚠️ Claude Opus 4.5 使用须知\n\n" +
          "1. 需要科学上网（VPN）才能连接 Anthropic 服务器\n" +
          "2. 请确保 VPN 已开启且连接稳定（推荐美国/日本节点）\n" +
          "3. 如果切换后发送消息无响应或报错，请检查 VPN 连接\n" +
          "4. Claude 是目前最强的模型，适合复杂写作和深度分析\n" +
          "5. 如不具备 VPN 条件，建议使用 Kimi 或 Qwen 模型\n\n" +
          "确定切换到 Claude Opus 4.5 吗？"
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
        {isOpen && (
          <div className="model-dropdown">
            {isLoadingModels ? (
              <div className="model-option loading">加载中...</div>
            ) : models.length > 0 ? (
              models.map((m) => (
                <button
                  key={m.id}
                  className={`model-option${m.name === currentModel ? " active" : ""}`}
                  onClick={() => handleSelect(m)}
                >
                  {m.name}
                  {m.needsVpn && <span className="vpn-tag">需VPN</span>}
                </button>
              ))
            ) : (
              <div className="model-option disabled">暂无可用模型</div>
            )}
          </div>
        )}
      </div>
      <WindowControls />
    </div>
  );
}
