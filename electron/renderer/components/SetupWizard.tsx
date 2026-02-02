import React, { useState } from "react";

interface SetupWizardProps {
  onComplete: () => void;
}

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const [anthropicKey, setAnthropicKey] = useState("");
  const [minimaxKey, setMinimaxKey] = useState("");
  const [dashscopeKey, setDashscopeKey] = useState("");
  const [moonshotKey, setMoonshotKey] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = anthropicKey.trim();
    if (!trimmed) {
      setError("Anthropic API Key 不能为空");
      return;
    }
    setError("");
    setSubmitting(true);

    try {
      const result = await window.api.submitSetup({
        anthropicKey: trimmed,
        minimaxKey: minimaxKey.trim() || undefined,
        dashscopeKey: dashscopeKey.trim() || undefined,
        moonshotKey: moonshotKey.trim() || undefined,
      });
      if (result.ok) {
        onComplete();
      } else {
        setError(result.error || "配置失败，请重试");
      }
    } catch (err: any) {
      setError(err.message || "配置失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="setup-overlay">
      <div className="setup-card">
        <div className="setup-header">
          <h1 className="setup-title">大师兄</h1>
          <p className="setup-subtitle">学术写作助手</p>
        </div>

        <form className="setup-form" onSubmit={handleSubmit}>
          <div className="setup-field">
            <label className="setup-label" htmlFor="anthropic-key">
              Anthropic API Key
              <span className="setup-required">*</span>
            </label>
            <input
              id="anthropic-key"
              className="setup-input"
              type="password"
              placeholder="sk-ant-..."
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              autoFocus
              disabled={submitting}
            />
          </div>

          <div className="setup-field">
            <label className="setup-label" htmlFor="minimax-key">
              MiniMax API Key
              <span className="setup-optional">（选填）</span>
            </label>
            <input
              id="minimax-key"
              className="setup-input"
              type="password"
              placeholder="eyJ..."
              value={minimaxKey}
              onChange={(e) => setMinimaxKey(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="setup-field">
            <label className="setup-label" htmlFor="dashscope-key">
              DashScope API Key
              <span className="setup-optional">（选填）</span>
            </label>
            <input
              id="dashscope-key"
              className="setup-input"
              type="password"
              placeholder="sk-..."
              value={dashscopeKey}
              onChange={(e) => setDashscopeKey(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="setup-field">
            <label className="setup-label" htmlFor="moonshot-key">
              Moonshot API Key
              <span className="setup-optional">（选填）</span>
            </label>
            <input
              id="moonshot-key"
              className="setup-input"
              type="password"
              placeholder="sk-..."
              value={moonshotKey}
              onChange={(e) => setMoonshotKey(e.target.value)}
              disabled={submitting}
            />
          </div>

          {error && <p className="setup-error">{error}</p>}

          <button
            className="setup-submit"
            type="submit"
            disabled={submitting || !anthropicKey.trim()}
          >
            {submitting ? "配置中..." : "开始使用"}
          </button>
        </form>

        <p className="setup-hint">
          API Key 将保存在本地，不会上传到任何服务器。
        </p>
      </div>
    </div>
  );
}
