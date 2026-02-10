import React from "react";
import { X, Sun, Moon, Monitor, FolderOpen, RefreshCw } from "lucide-react";
import { useUIStore } from "../../stores/ui-store";

export default function SettingsPanel() {
  const { theme, setTheme, closePanel } = useUIStore();

  const handleOpenOutputDir = () => {
    window.api.revealOutputDir();
  };

  const handleRefreshBookshelf = () => {
    window.api.scanBookshelf();
  };

  return (
    <div className="sidebar-panel">
      <div className="sidebar-panel-header">
        <span className="sidebar-panel-title">设置</span>
        <button
          className="icon-btn sidebar-panel-close"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            closePanel();
          }}
        >
          <X size={16} />
        </button>
      </div>

      <div className="sidebar-panel-body">
        {/* 外观设置 */}
        <div className="settings-section">
          <div className="settings-section-title">外观</div>
          <div className="settings-theme-options">
            <button
              className={`settings-theme-btn ${theme === "light" ? "active" : ""}`}
              onClick={() => setTheme("light")}
            >
              <Sun size={16} />
              <span>亮色</span>
            </button>
            <button
              className={`settings-theme-btn ${theme === "dark" ? "active" : ""}`}
              onClick={() => setTheme("dark")}
            >
              <Moon size={16} />
              <span>暗色</span>
            </button>
          </div>
        </div>

        {/* 文件管理 */}
        <div className="settings-section">
          <div className="settings-section-title">文件管理</div>
          <div className="settings-actions">
            <button className="settings-action-btn" onClick={handleOpenOutputDir}>
              <FolderOpen size={14} />
              <span>打开输出目录</span>
            </button>
            <button className="settings-action-btn" onClick={handleRefreshBookshelf}>
              <RefreshCw size={14} />
              <span>刷新书桌</span>
            </button>
          </div>
        </div>

        {/* 关于 */}
        <div className="settings-section">
          <div className="settings-section-title">关于</div>
          <div className="settings-about">
            <div className="settings-about-row">
              <span className="settings-about-label">版本</span>
              <span className="settings-about-value">1.0.1</span>
            </div>
            <div className="settings-about-row">
              <span className="settings-about-label">开发者</span>
              <span className="settings-about-value">大师兄团队</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
