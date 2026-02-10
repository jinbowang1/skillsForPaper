/**
 * 登录/注册面板组件
 * 用于用户登录大师兄服务端
 */

import { useState } from "react";
import { useAuthStore } from "../stores/auth-store";
import { LogIn, UserPlus, Mail, Lock, User, Gift, Loader2, AlertCircle, CheckCircle, X } from "lucide-react";

type Mode = "login" | "register";

interface LoginPanelProps {
  onClose?: () => void;
}

export function LoginPanel({ onClose }: LoginPanelProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { login, register } = useAuthStore();

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email || !password) {
      setError("请填写邮箱和密码");
      return;
    }

    if (mode === "register") {
      if (password !== confirmPassword) {
        setError("两次输入的密码不一致");
        return;
      }
      if (password.length < 6) {
        setError("密码至少需要 6 位");
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === "login") {
        const result = await login(email, password);
        if (result.success) {
          setSuccess("登录成功！");
          // 登录成功后关闭面板
          setTimeout(() => onClose?.(), 500);
        } else {
          setError(result.error || "登录失败");
        }
      } else {
        const result = await register(email, password, nickname || undefined, inviteCode || undefined);
        if (result.success) {
          setSuccess("注册成功！请登录");
          setMode("login");
          setPassword("");
          setConfirmPassword("");
        } else {
          setError(result.error || "注册失败");
        }
      }
    } catch (err) {
      setError("操作失败，请检查网络连接");
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchMode = (e: React.MouseEvent) => {
    e.preventDefault();
    setMode(mode === "login" ? "register" : "login");
    setError("");
    setSuccess("");
  };

  return (
    <>
      <div className="sidebar-panel-header">
        <span className="sidebar-panel-title">
          {mode === "login" ? "登录" : "注册"}
        </span>
        <button
          type="button"
          className="icon-btn sidebar-panel-close"
          onClick={handleClose}
        >
          <X size={14} />
        </button>
      </div>
      <div className="sidebar-panel-body">
        {/* 标题描述 */}
        <div className="login-header">
          <p className="login-subtitle">
            {mode === "login"
              ? "登录后可同步使用统计、订阅状态"
              : "创建账号开始使用大师兄"}
          </p>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="login-form">
          {/* 邮箱 */}
          <div className="login-field">
            <Mail size={16} className="login-field-icon" />
            <input
              type="email"
              placeholder="邮箱地址"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* 昵称（仅注册） */}
          {mode === "register" && (
            <div className="login-field">
              <User size={16} className="login-field-icon" />
              <input
                type="text"
                placeholder="昵称（可选）"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          {/* 密码 */}
          <div className="login-field">
            <Lock size={16} className="login-field-icon" />
            <input
              type="password"
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* 确认密码（仅注册） */}
          {mode === "register" && (
            <div className="login-field">
              <Lock size={16} className="login-field-icon" />
              <input
                type="password"
                placeholder="确认密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          {/* 邀请码（仅注册） */}
          {mode === "register" && (
            <div className="login-field">
              <Gift size={16} className="login-field-icon" />
              <input
                type="text"
                placeholder="邀请码（可选，可获得 3 天试用）"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                disabled={loading}
              />
            </div>
          )}

          {/* 错误提示 */}
          {error && (
            <div className="login-message login-error">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          {/* 成功提示 */}
          {success && (
            <div className="login-message login-success">
              <CheckCircle size={14} />
              <span>{success}</span>
            </div>
          )}

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={loading}
            className="login-submit-btn"
          >
            {loading ? (
              <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
            ) : mode === "login" ? (
              <>
                <LogIn size={16} />
                登录
              </>
            ) : (
              <>
                <UserPlus size={16} />
                注册
              </>
            )}
          </button>
        </form>

        {/* 切换模式 */}
        <div className="login-switch">
          <button
            type="button"
            onClick={handleSwitchMode}
            disabled={loading}
          >
            {mode === "login" ? "没有账号？立即注册" : "已有账号？立即登录"}
          </button>
        </div>

        {/* 跳过登录 */}
        <button
          type="button"
          onClick={handleClose}
          className="login-skip-btn"
          disabled={loading}
        >
          暂不登录
        </button>
      </div>
    </>
  );
}

export default LoginPanel;
