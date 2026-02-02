import React, { useState, useEffect } from "react";
import { Minus, Square, Copy, X } from "lucide-react";

export default function WindowControls() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Only render on Windows
    if (window.api?.platform !== "win32") return;

    window.api.windowIsMaximized().then(setIsMaximized).catch(() => {});

    const unsub = window.api.onMaximizedChange(setIsMaximized);
    return unsub;
  }, []);

  if (window.api?.platform !== "win32") return null;

  return (
    <div className="window-controls">
      <button
        className="window-control-btn"
        onClick={() => window.api.windowMinimize()}
        title="最小化"
      >
        <Minus size={14} />
      </button>
      <button
        className="window-control-btn"
        onClick={() => window.api.windowMaximize()}
        title={isMaximized ? "还原" : "最大化"}
      >
        {isMaximized ? <Copy size={12} /> : <Square size={12} />}
      </button>
      <button
        className="window-control-btn close"
        onClick={() => window.api.windowClose()}
        title="关闭"
      >
        <X size={14} />
      </button>
    </div>
  );
}
