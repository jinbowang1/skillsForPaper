import React from "react";
import { Settings, BookOpen, HelpCircle } from "lucide-react";

export default function UserPanel() {
  // TODO: Read from MEMORY.md dynamically
  const userName = "王大爆";
  const userInitial = userName.charAt(0);
  const institution = "天津大学 · 硕士";

  return (
    <div className="shelf-footer">
      <div className="user-row">
        <div className="user-avatar">{userInitial}</div>
        <div className="user-detail">
          <div className="user-name">{userName}</div>
          <div className="user-meta">
            <span>{institution}</span>
          </div>
        </div>
      </div>
      <div className="user-actions-row">
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
  );
}
