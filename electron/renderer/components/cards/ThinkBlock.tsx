import React, { useState } from "react";
import { Brain, ChevronDown } from "lucide-react";

interface Props {
  text: string;
  isStreaming?: boolean;
}

export default function ThinkBlock({ text, isStreaming }: Props) {
  const [expanded, setExpanded] = useState(false);

  // Always show during streaming (even if text is still empty).
  // After streaming, hide if truly empty.
  if (!text && !isStreaming) return null;

  return (
    <div className={`think-block ${expanded ? "expanded" : ""}`}>
      <div className="think-header" onClick={() => setExpanded(!expanded)}>
        <div className="think-header-left">
          <Brain size={14} />
          <span>
            {expanded
              ? "思考过程"
              : isStreaming && !text
                ? "正在思考..."
                : "思考了一下..."}
          </span>
          {isStreaming && (
            <span className="spinner" style={{ width: 10, height: 10, borderWidth: "1.5px" }} />
          )}
        </div>
        <button className="think-toggle">
          <ChevronDown size={12} />
        </button>
      </div>
      <div className="think-content">
        <div className="think-text">
          {text ? (
            <span style={{ whiteSpace: "pre-wrap" }}>{text}</span>
          ) : (
            <span style={{ color: "var(--text-tertiary)", fontStyle: "italic" }}>思考中...</span>
          )}
        </div>
      </div>
    </div>
  );
}
