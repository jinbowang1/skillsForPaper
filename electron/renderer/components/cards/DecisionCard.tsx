import React, { useState, useCallback, useEffect } from "react";
import { Check } from "lucide-react";
import { useSessionStore } from "../../stores/session-store";
import DashixiongAvatar from "../DashixiongAvatar";

interface Props {
  toolCallId: string;
  question: string;
  options: Array<{ label: string; description?: string }>;
  answered?: boolean;
  selectedIndex?: number;
  /** Custom answer text (set by InputBar when user uses free-text reply) */
  customAnswer?: string;
}

export default function DecisionCard({
  toolCallId,
  question,
  options,
  answered = false,
  selectedIndex,
  customAnswer,
}: Props) {
  const [localSelected, setLocalSelected] = useState<number | undefined>(selectedIndex);
  const [isAnswered, setIsAnswered] = useState(answered);
  const markDecisionAnswered = useSessionStore((s) => s.markDecisionAnswered);
  const setPendingDecision = useSessionStore((s) => s.setPendingDecision);
  const pendingDecision = useSessionStore((s) => s.pendingDecision);

  // Sync store → local state (when InputBar answers this decision externally)
  useEffect(() => {
    if (answered && !isAnswered) {
      setIsAnswered(true);
      if (selectedIndex !== undefined) setLocalSelected(selectedIndex);
    }
  }, [answered, selectedIndex]);

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

  const handleCustomTrigger = useCallback(() => {
    // Activate the main InputBar for free-text reply (supports voice input)
    setPendingDecision({ toolCallId, question });
  }, [toolCallId, question, setPendingDecision]);

  // Answered → compact single-line showing question + selected answer
  if (isAnswered && localSelected !== undefined) {
    const answerLabel = localSelected === -1
      ? (customAnswer || "")
      : options[localSelected]?.label;
    return (
      <div className="decision-card answered">
        <div className="dc-answered-row">
          <DashixiongAvatar size={18} />
          <span className="dc-answered-q">{question}</span>
          <span className="dc-answered-a">
            <Check size={10} />
            {answerLabel}
          </span>
        </div>
      </div>
    );
  }

  // Whether this decision's free-text mode is active in InputBar
  const isThisPending = pendingDecision?.toolCallId === toolCallId;

  // Unanswered → full card with all options
  return (
    <div className="decision-card">
      <div className="dc-header">
        <DashixiongAvatar size={20} />
        <div className="dc-question">{question}</div>
      </div>
      <div className="dc-options">
        {options.map((opt, i) => (
          <button
            key={i}
            className={`dc-option ${i === 0 ? "recommended" : ""}`}
            onClick={() => handleSelect(i)}
          >
            <div className="dc-opt-body">
              <div className="dc-opt-title">
                {opt.label}
                {i === 0 && (
                  <span className="dc-opt-rec">推荐</span>
                )}
              </div>
              {opt.description && (
                <div className="dc-opt-desc">{opt.description}</div>
              )}
            </div>
            <div className="dc-check" />
          </button>
        ))}

        <button
          className={`dc-option dc-custom-trigger ${isThisPending ? "active" : ""}`}
          onClick={handleCustomTrigger}
        >
          <div className="dc-opt-body">
            <div className="dc-opt-title">
              {isThisPending ? "请在下方输入框回复..." : "自由输入..."}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
