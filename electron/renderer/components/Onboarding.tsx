import React, { useState, useEffect } from "react";
import {
  ArrowRight,
  Sparkles,
  Lightbulb,
  Code,
  FileText,
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Mic,
  HardDrive,
  Wifi,
  Terminal,
} from "lucide-react";

interface Props {
  onComplete: () => void;
}

interface Step {
  icon: React.ReactNode;
  title: string;
  desc: string;
  tags?: string[];
  isPermissionStep?: boolean;
}

interface HealthCheckResult {
  permissions: {
    microphone: "granted" | "denied" | "not-determined" | "restricted" | "unknown";
    disk: "ok" | "error";
  };
  tools: {
    python: boolean;
    bash: boolean;
    sox: boolean;
  };
  network: {
    connected: boolean;
    error?: string;
  };
  allGood: boolean;
}

const INTRO_STEPS: Step[] = [
  {
    icon: <Sparkles size={32} />,
    title: "你好，我是大师兄",
    desc: "你的 AI 科研写作助手，从选题到发表，全程陪你搞定。",
    tags: ["创新点挖掘", "实验设计", "代码编写与执行", "智能润色", "生成目标期刊pdf"],
  },
  {
    icon: <Lightbulb size={32} />,
    title: "创新点挖掘 & 实验设计",
    desc: "告诉我你的研究方向，我帮你找创新点、设计实验方案、梳理研究思路。",
  },
  {
    icon: <Code size={32} />,
    title: "代码编写与执行",
    desc: "我可以帮你写 Python 代码并直接运行，数据处理、可视化、统计分析一步到位。",
  },
  {
    icon: <FileText size={32} />,
    title: "智能润色 & 生成期刊 PDF",
    desc: "写完的论文我帮你润色修改，还能按目标期刊格式直接生成 PDF，省去排版烦恼。",
  },
];

const PERMISSION_STEP: Step = {
  icon: <Shield size={32} />,
  title: "系统检查",
  desc: "检查运行环境和权限，确保所有功能正常可用。",
  isPermissionStep: true,
};

function PermissionCheckUI({
  result,
  checking,
  onRequestMicrophone,
  micRequesting,
}: {
  result: HealthCheckResult | null;
  checking: boolean;
  onRequestMicrophone: () => void;
  micRequesting: boolean;
}) {
  if (checking || !result) {
    return (
      <div className="permission-check-loading">
        <Loader2 size={24} className="spin" />
        <span>正在检查系统环境...</span>
      </div>
    );
  }

  const items = [
    {
      icon: <Wifi size={18} />,
      label: "网络连接",
      status: result.network.connected ? "ok" : "error",
      hint: result.network.connected ? "已连接" : (result.network.error || "无法连接网络"),
    },
    {
      icon: <Terminal size={18} />,
      label: "代码执行环境",
      status: result.tools.bash && result.tools.python ? "ok" : "warning",
      hint: result.tools.bash && result.tools.python
        ? "Python 和 Shell 已就绪"
        : !result.tools.bash
          ? "Shell 不可用，代码执行受限"
          : "Python 不可用，部分功能受限",
    },
    {
      icon: <HardDrive size={18} />,
      label: "文件读写",
      status: result.permissions.disk === "ok" ? "ok" : "error",
      hint: result.permissions.disk === "ok" ? "可正常读写文件" : "无法写入文件，请检查权限",
    },
    {
      icon: <Mic size={18} />,
      label: "麦克风权限",
      status: result.permissions.microphone === "granted"
        ? "ok"
        : result.permissions.microphone === "denied"
          ? "error"
          : "optional",
      hint: result.permissions.microphone === "granted"
        ? "已授权"
        : result.permissions.microphone === "denied"
          ? "已拒绝（语音功能不可用）"
          : "未授权（语音功能可选）",
      action: result.permissions.microphone === "not-determined" && (
        <button
          className="permission-grant-btn"
          onClick={onRequestMicrophone}
          disabled={micRequesting}
        >
          {micRequesting ? <Loader2 size={14} className="spin" /> : "授权"}
        </button>
      ),
    },
  ];

  return (
    <div className="permission-check-list">
      {items.map((item, i) => (
        <div key={i} className={`permission-check-item status-${item.status}`}>
          <span className="permission-icon">{item.icon}</span>
          <span className="permission-label">{item.label}</span>
          <span className="permission-hint">{item.hint}</span>
          {item.status === "ok" && <CheckCircle2 size={18} className="status-icon ok" />}
          {item.status === "error" && <XCircle size={18} className="status-icon error" />}
          {item.status === "warning" && <AlertCircle size={18} className="status-icon warning" />}
          {item.status === "optional" && (
            item.action || <AlertCircle size={18} className="status-icon optional" />
          )}
        </div>
      ))}

      {result.allGood ? (
        <div className="permission-summary ok">
          <CheckCircle2 size={20} />
          <span>所有检查通过，可以开始使用！</span>
        </div>
      ) : (
        <div className="permission-summary warning">
          <AlertCircle size={20} />
          <span>部分功能可能受限，但仍可使用基础功能</span>
        </div>
      )}
    </div>
  );
}

export default function Onboarding({ onComplete }: Props) {
  const allSteps = [...INTRO_STEPS, PERMISSION_STEP];
  const [step, setStep] = useState(0);
  const [healthResult, setHealthResult] = useState<HealthCheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [micRequesting, setMicRequesting] = useState(false);

  const current = allSteps[step];
  const isLast = step === allSteps.length - 1;
  const isPermissionStep = current.isPermissionStep;

  // Run health check when entering permission step
  useEffect(() => {
    if (isPermissionStep && !healthResult && !checking) {
      setChecking(true);
      window.api.healthCheck().then((result: HealthCheckResult) => {
        setHealthResult(result);
        setChecking(false);
      }).catch(() => {
        setChecking(false);
      });
    }
  }, [isPermissionStep, healthResult, checking]);

  const handleRequestMicrophone = async () => {
    setMicRequesting(true);
    try {
      await window.api.requestMicrophonePermission();
      // Re-run health check to get updated status
      const result = await window.api.healthCheck();
      setHealthResult(result);
    } catch {
      // ignore
    } finally {
      setMicRequesting(false);
    }
  };

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        <div className="onboarding-icon">{current.icon}</div>
        <h2 className="onboarding-title">{current.title}</h2>
        <p className="onboarding-desc">{current.desc}</p>

        {current.tags && (
          <div className="onboarding-tags">
            {current.tags.map((tag) => (
              <span key={tag} className="onboarding-tag">{tag}</span>
            ))}
          </div>
        )}

        {isPermissionStep && (
          <PermissionCheckUI
            result={healthResult}
            checking={checking}
            onRequestMicrophone={handleRequestMicrophone}
            micRequesting={micRequesting}
          />
        )}

        <div className="onboarding-dots">
          {allSteps.map((_, i) => (
            <span
              key={i}
              className={`onboarding-dot ${i === step ? "active" : ""}`}
            />
          ))}
        </div>

        <div className="onboarding-actions">
          <button
            className="onboarding-btn primary"
            onClick={handleNext}
            disabled={isPermissionStep && checking}
          >
            {isLast ? "开始使用" : "下一步"}
            <ArrowRight size={14} />
          </button>
          {!isLast && (
            <button className="onboarding-btn skip" onClick={handleSkip}>
              跳过
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
