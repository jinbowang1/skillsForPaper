import React, { useState, useRef, useEffect } from "react";
import { X, Camera, FolderOpen, RotateCcw } from "lucide-react";
import { useUIStore } from "../../stores/ui-store";
import { useUserStore } from "../../stores/user-store";
import { useToastStore } from "../../stores/toast-store";

export default function ProfilePanel() {
  const closePanel = useUIStore((s) => s.closePanel);
  const { userInfo, avatarUrl, fetchAvatar, updateUserInfo } = useUserStore();
  const addToast = useToastStore((s) => s.addToast);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: userInfo?.name || "",
    identity: userInfo?.identity || "",
    institution: userInfo?.institution || "",
    researchField: userInfo?.researchField || "",
    advisor: userInfo?.advisor || "",
    project: userInfo?.project || "",
  });
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [outputDir, setOutputDir] = useState<{ current: string; default: string } | null>(null);

  useEffect(() => {
    fetchAvatar();
    window.api.getOutputDir().then(setOutputDir).catch(() => {});
  }, []);

  const displayAvatar = localAvatar || avatarUrl;

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setLocalAvatar(dataUrl);
      try {
        await window.api.setAvatar(dataUrl, file.type);
        await fetchAvatar();
      } catch {
        addToast("头像上传失败");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleChange = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSelectOutputDir = async () => {
    try {
      const newPath = await window.api.selectOutputDir();
      if (newPath) {
        setOutputDir({ current: newPath, default: outputDir?.default || newPath });
        addToast("已更改保存位置", "success");
      }
    } catch {
      addToast("更改保存位置失败");
    }
  };

  const handleResetOutputDir = async () => {
    try {
      const defaultPath = await window.api.resetOutputDir();
      setOutputDir({ current: defaultPath, default: defaultPath });
      addToast("已恢复默认位置", "success");
    } catch {
      addToast("恢复默认位置失败");
    }
  };

  const handleRevealOutputDir = () => {
    window.api.revealOutputDir();
  };

  const isCustomOutputDir = outputDir && outputDir.current !== outputDir.default;

  const handleSave = async () => {
    setSaving(true);
    try {
      const ok = await updateUserInfo(form);
      if (ok) {
        addToast("已保存", "success");
        closePanel();
      } else {
        addToast("保存失败，请重试");
      }
    } catch {
      addToast("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  const fields: Array<{ key: keyof typeof form; label: string; placeholder: string }> = [
    { key: "name", label: "姓名", placeholder: "你的名字" },
    { key: "identity", label: "身份", placeholder: "如：硕士研究生" },
    { key: "institution", label: "单位", placeholder: "学校或机构" },
    { key: "researchField", label: "研究领域", placeholder: "如：计算机视觉" },
    { key: "advisor", label: "导师", placeholder: "导师姓名" },
    { key: "project", label: "项目", placeholder: "当前项目名称" },
  ];

  return (
    <div className="sidebar-panel">
      <div className="sidebar-panel-header">
        <span className="sidebar-panel-title">个人资料</span>
        <button className="icon-btn sidebar-panel-close" onClick={closePanel}>
          <X size={14} />
        </button>
      </div>
      <div className="sidebar-panel-body">
        <div className="profile-avatar-section" onClick={handleAvatarClick}>
          {displayAvatar ? (
            <img src={displayAvatar} alt="头像" className="profile-avatar-preview" />
          ) : (
            <div className="profile-avatar-preview profile-avatar-placeholder">
              <Camera size={24} />
            </div>
          )}
          <div className="profile-avatar-hint">更换头像</div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleAvatarChange}
          />
        </div>

        <div className="profile-form">
          {fields.map(({ key, label, placeholder }) => (
            <div className="profile-field" key={key}>
              <label>{label}</label>
              <input
                type="text"
                value={form[key]}
                onChange={handleChange(key)}
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>

        <div className="profile-section-divider" />

        <div className="profile-output-section">
          <div className="profile-output-label">产出物保存位置</div>
          <div
            className="profile-output-path"
            onClick={handleRevealOutputDir}
            title="点击打开文件夹"
          >
            {outputDir?.current || "加载中..."}
          </div>
          <div className="profile-output-actions">
            <button
              className="profile-output-btn"
              onClick={handleSelectOutputDir}
            >
              <FolderOpen size={14} />
              更改位置
            </button>
            {isCustomOutputDir && (
              <button
                className="profile-output-btn secondary"
                onClick={handleResetOutputDir}
              >
                <RotateCcw size={14} />
                恢复默认
              </button>
            )}
          </div>
        </div>

        <button
          className="profile-save-btn"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "保存中..." : "保存"}
        </button>
      </div>
    </div>
  );
}
