import React from "react";
import { Sun, Moon, HelpCircle, Settings } from "lucide-react";
import { useUserStore } from "../../stores/user-store";
import { useUIStore } from "../../stores/ui-store";
import { useAuthStore } from "../../stores/auth-store";

export default function UserPanel() {
  const { userName, userInitial, avatarUrl } = useUserStore();
  const { theme, toggleTheme, openPanel } = useUIStore();
  const { isLoggedIn, isLoading, subscription, user } = useAuthStore();

  // 获取订阅状态文字
  const getSubscriptionLabel = () => {
    if (isLoading) return "加载中...";
    if (!isLoggedIn) return "点击登录";
    if (subscription?.trial.isInTrial) return "试用中";
    if (subscription?.subscription) {
      return subscription.subscription.planName;
    }
    return "未订阅";
  };

  // 获取订阅状态样式
  const getSubscriptionClass = () => {
    if (!isLoggedIn) return "user-plan-login";
    if (subscription?.trial.isInTrial) return "user-plan-trial";
    if (subscription?.subscription) return "user-plan-active";
    return "user-plan-none";
  };

  // 显示的用户名：优先使用服务端用户名
  const displayName = isLoggedIn && user?.nickname
    ? user.nickname
    : (isLoggedIn && user?.email
      ? user.email.split("@")[0]
      : userName);

  return (
    <div className="desk-footer">
      <div className="user-row">
        {/* 点击头像打开个人资料 */}
        <div
          className="user-avatar"
          onClick={() => openPanel("profile")}
          title="编辑个人资料"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="头像" />
          ) : (
            userInitial
          )}
        </div>

        {/* 点击用户信息区域打开账户面板 */}
        <div
          className="user-detail user-detail-clickable"
          onClick={() => openPanel("account")}
          title="账户与订阅"
        >
          <div className="user-name">{displayName}</div>
          <div className={`user-plan ${getSubscriptionClass()}`}>
            {getSubscriptionLabel()}
          </div>
        </div>

        {/* 功能按钮 */}
        <div className="user-actions">
          <button
            className="icon-btn"
            title={theme === "dark" ? "切换亮色模式" : "切换暗色模式"}
            onClick={toggleTheme}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            className="icon-btn"
            title="使用帮助"
            onClick={() => openPanel("guide")}
          >
            <HelpCircle size={16} />
          </button>
          <button
            className="icon-btn"
            title="软件设置"
            onClick={() => openPanel("settings")}
          >
            <Settings size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
