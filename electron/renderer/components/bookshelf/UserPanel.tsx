import React, { useEffect, useState } from "react";
import { Settings, BookOpen, HelpCircle } from "lucide-react";

interface UserInfo {
  name: string;
  identity: string;
  institution: string;
  researchField: string;
  advisor: string;
  project: string;
}

export default function UserPanel() {
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    window.api.getUserInfo().then(setUser).catch(console.error);
  }, []);

  const userName = user?.name || "用户";
  const userInitial = userName.charAt(0);
  const institution = [user?.institution, user?.identity]
    .filter(Boolean)
    .join(" · ") || "未设置";

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
