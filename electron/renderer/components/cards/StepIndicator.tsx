import React from "react";
import { ClipboardList, Check, ArrowRight } from "lucide-react";

interface Step {
  label: string;
  status: "done" | "current" | "pending";
}

interface Props {
  title: string;
  steps: Step[];
}

export default function StepIndicator({ title, steps }: Props) {
  if (!steps.length) return null;

  // Truncate step labels if too long
  const truncate = (s: string, max: number) =>
    s.length > max ? s.slice(0, max) + "..." : s;

  return (
    <div className="step-card">
      <div className="step-card-title">
        <ClipboardList size={14} />
        {title || "任务进度"}
      </div>
      <div className="steps">
        {steps.map((step, i) => (
          <React.Fragment key={i}>
            <div className={`step ${step.status}`}>
              <div className="step-dot">
                {step.status === "done" ? (
                  <Check size={10} />
                ) : (
                  i + 1
                )}
              </div>
              <div className="step-label" title={step.label}>{truncate(step.label, 6)}</div>
            </div>
            {i < steps.length - 1 && (
              <span className="step-arrow">
                <ArrowRight size={10} />
              </span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
