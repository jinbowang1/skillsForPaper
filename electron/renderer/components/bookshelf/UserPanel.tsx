import React from "react";
import { Sun, Moon, BookOpen, HelpCircle } from "lucide-react";
import { useUserStore } from "../../stores/user-store";
import { useUIStore } from "../../stores/ui-store";

export default function UserPanel() {
  const { userInfo, userName, userInitial, avatarUrl } = useUserStore();
  const { theme, toggleTheme, openPanel } = useUIStore();

  const hasInfo = userInfo?.institution || userInfo?.identity;
  const meta = [userInfo?.institution, userInfo?.identity]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="desk-footer">
      <div className="user-row">
        <div className="user-avatar" onClick={() => openPanel("profile")} style={{ cursor: "pointer" }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="头像" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            userInitial
          )}
        </div>
        <div className="user-detail">
          <div className="user-name" title={userName}>{userName}</div>
          {hasInfo ? (
            <div className="user-meta" title={meta}>{meta}</div>
          ) : (
            <div
              className="user-meta user-meta-setup"
              onClick={() => openPanel("profile")}
              title="点击设置个人信息"
            >
              点击设置个人信息
            </div>
          )}
        </div>
        <div className="user-actions">
          <button
            className="icon-btn"
            title={theme === "dark" ? "切换亮色" : "切换暗色"}
            onClick={toggleTheme}
          >
            {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
          </button>
          <button className="icon-btn" title="使用指南" onClick={() => openPanel("guide")}>
            <BookOpen size={13} />
          </button>
          <button className="icon-btn" title="常见问题" onClick={() => openPanel("faq")}>
            <HelpCircle size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
