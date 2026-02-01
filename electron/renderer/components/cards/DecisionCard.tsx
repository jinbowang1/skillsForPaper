import React, { useState, useCallback } from "react";
import { GraduationCap, Check } from "lucide-react";
import { useSessionStore } from "../../stores/session-store";

interface Props {
  toolCallId: string;
  question: string;
  options: Array<{ label: string; description?: string }>;
  answered?: boolean;
  selectedIndex?: number;
}

export default function DecisionCard({
  toolCallId,
  question,
  options,
  answered = false,
  selectedIndex,
}: Props) {
  const [localSelected, setLocalSelected] = useState<number | undefined>(selectedIndex);
  const [isAnswered, setIsAnswered] = useState(answered);
  const markDecisionAnswered = useSessionStore((s) => s.markDecisionAnswered);

  const handleSelect = useCallback(
    async (index: number) => {
      if (isAnswered) return;

      setLocalSelected(index);
      setIsAnswered(true);

      const answer = options[index].label;
      markDecisionAnswered(toolCallId, index);

      try {
        await window.api.respondDecision(toolCallId, answer);
      } catch (err) {
        console.error("Failed to respond to decision:", err);
      }
    },
    [toolCallId, options, isAnswered, markDecisionAnswered]
  );

  return (
    <div className={`decision-card ${isAnswered ? "answered" : ""}`}>
      <div className="dc-header">
        <div className="dc-avatar">
          <GraduationCap size={12} color="white" />
        </div>
        <div className="dc-question">{question}</div>
      </div>
      <div className="dc-options">
        {options.map((opt, i) => (
          <button
            key={i}
            className={`dc-option ${i === 0 ? "recommended" : ""} ${
              localSelected === i ? "selected" : ""
            }`}
            onClick={() => handleSelect(i)}
            disabled={isAnswered && localSelected !== i}
          >
            <div className="dc-icon">
              {getOptionIcon(i)}
            </div>
            <div className="dc-opt-body">
              <div className="dc-opt-title">
                {opt.label}
                {i === 0 && !isAnswered && (
                  <span className="dc-opt-rec">推荐</span>
                )}
              </div>
              {opt.description && (
                <div className="dc-opt-desc">{opt.description}</div>
              )}
            </div>
            <div className="dc-check">
              {localSelected === i && <Check size={12} />}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function getOptionIcon(index: number): string {
  const icons = ["📄", "📝", "📋", "🔬", "📊"];
  return icons[index % icons.length];
}
