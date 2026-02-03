import React, { useState } from "react";
import { ArrowRight, Sparkles, Lightbulb, FlaskConical, Code, Wand2, FileText } from "lucide-react";

interface Props {
  onComplete: () => void;
}

interface Step {
  icon: React.ReactNode;
  title: string;
  desc: string;
  tags?: string[];
}

const STEPS: Step[] = [
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

export default function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

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

        <div className="onboarding-dots">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`onboarding-dot ${i === step ? "active" : ""}`}
            />
          ))}
        </div>

        <div className="onboarding-actions">
          <button className="onboarding-btn primary" onClick={handleNext}>
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
