import React, { useState } from "react";
import { Sparkles, ChevronDown } from "lucide-react";

interface Props {
  text: string;
  isStreaming?: boolean;
}

export default function ThinkBlock({ text, isStreaming }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!text && !isStreaming) return null;

  const label = isStreaming && !text
    ? "思考中..."
    : expanded
      ? "思考过程"
      : "思考了一下（点击展开）";

  return (
    <div className={`think-block ${expanded ? "expanded" : ""}`}>
      <div className="think-header" onClick={() => setExpanded(!expanded)}>
        <div className="think-header-left">
          <Sparkles size={13} />
          <span>{label}</span>
          {isStreaming && (
            <span className="spinner" style={{ width: 8, height: 8, borderWidth: "1.5px" }} />
          )}
        </div>
        <button className="think-toggle">
          <ChevronDown size={11} />
        </button>
      </div>
      <div className="think-content">
        <div className="think-text">
          {text ? (
            <span style={{ whiteSpace: "pre-wrap" }}>{text}</span>
          ) : (
            <span style={{ fontStyle: "italic" }}>思考中...</span>
          )}
        </div>
      </div>
    </div>
  );
}
