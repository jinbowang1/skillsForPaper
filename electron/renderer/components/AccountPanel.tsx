/**
 * 用户账户面板
 * 显示登录状态、订阅信息、邀请码等
 */

import { useEffect, useState } from "react";
import { useAuthStore, hasActiveSubscription, getRemainingTokens, formatTokens } from "../stores/auth-store";
import {
  User,
  LogOut,
  Crown,
  Gift,
  Copy,
  Check,
  RefreshCw,
  Clock,
  ExternalLink,
  X,
} from "lucide-react";
import { LoginPanel } from "./LoginPanel";

export function AccountPanel({ onClose }: { onClose?: () => void }) {
  const {
    isLoggedIn,
    isLoading,
    user,
    subscription,
    inviteCode,
    checkAuth,
    logout,
    refreshSubscription,
  } = useAuthStore();

  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const handleCopyInviteCode = async () => {
    if (inviteCode) {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshSubscription();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleClose = () => {
    onClose?.();
  };

  // 加载中
  if (isLoading) {
    return (
      <>
        <div className="sidebar-panel-header">
          <span className="sidebar-panel-title">账户</span>
          <button className="icon-btn sidebar-panel-close" onClick={handleClose}>
            <X size={14} />
          </button>
        </div>
        <div className="sidebar-panel-body" style={{ alignItems: "center", justifyContent: "center" }}>
          <RefreshCw size={24} style={{ animation: "spin 1s linear infinite", color: "var(--text-tertiary)" }} />
        </div>
      </>
    );
  }

  // 未登录 - 显示登录面板
  if (!isLoggedIn) {
    return <LoginPanel onClose={handleClose} />;
  }

  // 已登录 - 显示账户信息
  const hasSubscription = hasActiveSubscription(subscription);
  const remainingTokens = getRemainingTokens(subscription);

  return (
    <>
      <div className="sidebar-panel-header">
        <span className="sidebar-panel-title">账户</span>
        <button className="icon-btn sidebar-panel-close" onClick={handleClose}>
          <X size={14} />
        </button>
      </div>
      <div className="sidebar-panel-body">
        {/* 用户信息 */}
        <div className="account-user-row">
          <div className="account-user-avatar">
            <User size={20} />
          </div>
          <div className="account-user-info">
            <div className="account-user-name">
              {user?.nickname || user?.email?.split("@")[0] || "用户"}
            </div>
            <div className="account-user-email">{user?.email}</div>
          </div>
          <button
            onClick={handleLogout}
            className="icon-btn account-logout-btn"
            title="退出登录"
          >
            <LogOut size={16} />
          </button>
        </div>

        {/* 订阅状态 */}
        <div className="account-section">
          <div className="account-section-header">
            <div className="account-section-title">
              <Crown size={16} style={{ color: hasSubscription ? "var(--yellow)" : "var(--text-tertiary)" }} />
              <span>订阅状态</span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="icon-btn"
              title="刷新"
            >
              <RefreshCw size={14} style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
            </button>
          </div>

          {subscription?.trial.isInTrial ? (
            <>
              <div className="account-trial-badge">
                <Clock size={14} />
                <span>试用期</span>
                <span className="account-trial-date">
                  至 {new Date(subscription.trial.endAt!).toLocaleDateString()}
                </span>
              </div>
              <button
                className="account-upgrade-btn"
                onClick={() => window.api.openExternal("https://www.dashixiong.icu/pricing.html")}
              >
                <Crown size={14} />
                升级订阅
              </button>
            </>
          ) : subscription?.subscription ? (
            <div className="account-subscription-info">
              <div className="account-info-row">
                <span className="account-info-label">套餐</span>
                <span className="account-info-value">
                  {subscription.subscription.planName}
                </span>
              </div>
              <div className="account-info-row">
                <span className="account-info-label">到期时间</span>
                <span className="account-info-value">
                  {new Date(subscription.subscription.endDate).toLocaleDateString()}
                </span>
              </div>
              <div className="account-info-row">
                <span className="account-info-label">剩余 Token</span>
                <span className="account-info-value account-tokens">
                  {formatTokens(remainingTokens)}
                </span>
              </div>
              {/* Token 进度条 */}
              <div className="account-progress-bar">
                <div
                  className="account-progress-fill"
                  style={{
                    width: `${Math.min(
                      100,
                      (remainingTokens / subscription.subscription.monthlyTokens) * 100
                    )}%`,
                  }}
                />
              </div>
              <button
                className="account-manage-btn"
                onClick={() => window.api.openExternal("https://www.dashixiong.icu/pricing.html")}
              >
                管理订阅 <ExternalLink size={12} />
              </button>
            </div>
          ) : (
            <div className="account-no-subscription">
              <span>暂无有效订阅</span>
              <button
                className="account-upgrade-btn"
                onClick={() => window.api.openExternal("https://www.dashixiong.icu/pricing.html")}
              >
                <Crown size={14} />
                立即订阅
              </button>
            </div>
          )}
        </div>

        {/* 邀请奖励 */}
        {subscription && (
          <div className="account-section">
            <div className="account-section-header">
              <div className="account-section-title">
                <Gift size={16} style={{ color: "var(--purple)" }} />
                <span>邀请奖励</span>
              </div>
            </div>

            <div className="account-reward-grid">
              <div className="account-reward-item">
                <div className="account-reward-value">
                  ¥{subscription.inviteReward.total}
                </div>
                <div className="account-reward-label">累计获得</div>
              </div>
              <div className="account-reward-item">
                <div className="account-reward-value">
                  ¥{subscription.inviteReward.used}
                </div>
                <div className="account-reward-label">已使用</div>
              </div>
              <div className="account-reward-item">
                <div className="account-reward-value account-reward-available">
                  ¥{subscription.inviteReward.available}
                </div>
                <div className="account-reward-label">可用</div>
              </div>
            </div>

            {/* 邀请码 */}
            {inviteCode && (
              <div className="account-invite-section">
                <div className="account-invite-label">你的邀请码</div>
                <div className="account-invite-row">
                  <code className="account-invite-code">
                    {inviteCode}
                  </code>
                  <button
                    onClick={handleCopyInviteCode}
                    className="icon-btn"
                    title="复制邀请码"
                  >
                    {copied ? (
                      <Check size={16} style={{ color: "var(--green)" }} />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                </div>
                <p className="account-invite-hint">
                  邀请好友注册可获得 3 天试用期，好友订阅后你可获得 ¥1 奖励（上限 ¥30）
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default AccountPanel;
