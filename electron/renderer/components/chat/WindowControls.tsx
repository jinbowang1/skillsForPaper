import React from "react";

/**
 * Custom window controls for Windows frameless window
 */
export default function WindowControls() {
  const [platform, setPlatform] = React.useState<string>("");

  React.useEffect(() => {
    setPlatform(window.navigator.platform);
  }, []);

  // Only show on Windows
  if (!platform.startsWith("Win")) return null;

  const handleMinimize = () => {
    window.api.windowMinimize();
  };

  const handleMaximize = () => {
    window.api.windowMaximize();
  };

  const handleClose = () => {
    window.api.windowClose();
  };

  return (
    <div className="window-controls">
      <button className="window-control-btn minimize" onClick={handleMinimize} title="最小化">
        <svg width="10" height="1" viewBox="0 0 10 1">
          <path d="M0,0 L10,0" stroke="currentColor" strokeWidth="1"/>
        </svg>
      </button>
      <button className="window-control-btn maximize" onClick={handleMaximize} title="最大化">
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path d="M0,0 L10,0 L10,10 L0,10 Z" fill="none" stroke="currentColor" strokeWidth="1"/>
        </svg>
      </button>
      <button className="window-control-btn close" onClick={handleClose} title="关闭">
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path d="M0,0 L10,10 M10,0 L0,10" stroke="currentColor" strokeWidth="1"/>
        </svg>
      </button>
    </div>
  );
}
