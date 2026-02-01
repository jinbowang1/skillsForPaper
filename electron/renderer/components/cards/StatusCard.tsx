import React from "react";
import { FlaskConical, Check } from "lucide-react";

interface Metric {
  label: string;
  value: string;
  change?: string;
  changeType?: "good" | "neutral";
}

interface Props {
  metrics?: {
    title?: string;
    status?: "running" | "done" | "error";
    epoch?: { current: number; total: number };
    loss?: number;
    accuracy?: number;
    lr?: string;
    elapsed?: string;
    items?: Metric[];
  };
}

export default function StatusCard({ metrics }: Props) {
  if (!metrics) return null;

  const { title, status = "running", epoch, items } = metrics;
  const progress = epoch ? Math.round((epoch.current / epoch.total) * 100) : 0;

  const metricItems: Metric[] = items || [];
  if (!items) {
    if (metrics.loss !== undefined) {
      metricItems.push({
        label: "Loss",
        value: metrics.loss.toFixed(3),
        changeType: "good",
      });
    }
    if (metrics.accuracy !== undefined) {
      metricItems.push({
        label: "Accuracy",
        value: `${metrics.accuracy.toFixed(1)}%`,
        changeType: "good",
      });
    }
    if (metrics.lr) {
      metricItems.push({
        label: "LR",
        value: metrics.lr,
        changeType: "neutral",
      });
    }
    if (metrics.elapsed) {
      metricItems.push({
        label: "用时",
        value: metrics.elapsed,
        changeType: "neutral",
      });
    }
  }

  return (
    <div className="status-card">
      <div className="sc-header">
        <div className="sc-title">
          <FlaskConical size={16} />
          {title || "实验进行中"}
        </div>
        <div className={`sc-badge ${status}`}>
          {status === "running" ? (
            <>
              <span
                className="spinner"
                style={{ width: 10, height: 10, borderWidth: "1.5px" }}
              />
              运行中
            </>
          ) : (
            <>
              <Check size={12} /> 完成
            </>
          )}
        </div>
      </div>
      <div className="sc-body">
        {epoch && status === "running" && (
          <div className="sc-progress">
            <div className="sc-progress-label">
              <span>
                Epoch {epoch.current} / {epoch.total}
              </span>
              <span>{progress}%</span>
            </div>
            <div className="sc-progress-bar">
              <div
                className="sc-progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
        {metricItems.length > 0 && (
          <div className="metrics-grid">
            {metricItems.map((m, i) => (
              <div key={i} className="metric-box">
                <div className="metric-box-label">{m.label}</div>
                <div className="metric-box-value">{m.value}</div>
                {m.change && (
                  <div className={`metric-box-change ${m.changeType || "neutral"}`}>
                    {m.change}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {status === "running" && (
        <div className="sc-footer">
          <div className="sc-footer-left">
            <div className="pulse" />
            <span>实时更新 · 0 errors</span>
          </div>
          <div className="sc-footer-right">
            <button className="sc-btn ghost">查看日志</button>
            <button className="sc-btn danger" onClick={() => window.api.abort()}>
              停止
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
