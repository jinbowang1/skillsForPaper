import React from "react";
import { Settings, BookOpen, HelpCircle } from "lucide-react";
import { useUserStore } from "../../stores/user-store";

export default function UserPanel() {
  const { userInfo, userName, userInitial } = useUserStore();

  const meta = [userInfo?.institution, userInfo?.identity]
    .filter(Boolean)
    .join(" · ") || "未设置";

  return (
    <div className="desk-footer">
      <div className="user-row">
        <div className="user-avatar">{userInitial}</div>
        <div className="user-detail">
          <div className="user-name">{userName}</div>
          <div className="user-meta">{meta}</div>
        </div>
        <div className="user-actions">
          <button className="icon-btn" title="设置">
            <Settings size={13} />
          </button>
          <button className="icon-btn" title="记忆">
            <BookOpen size={13} />
          </button>
          <button className="icon-btn" title="帮助">
            <HelpCircle size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
