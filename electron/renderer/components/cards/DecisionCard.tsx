import React, { useState, useCallback } from "react";
import { Check } from "lucide-react";
import { useSessionStore } from "../../stores/session-store";
import DashixiongAvatar from "../DashixiongAvatar";

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
  const [customMode, setCustomMode] = useState(false);
  const [customText, setCustomText] = useState("");
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

  const handleCustomSubmit = useCallback(async () => {
    if (isAnswered || !customText.trim()) return;

    setLocalSelected(-1);
    setIsAnswered(true);

    markDecisionAnswered(toolCallId, -1);

    try {
      await window.api.respondDecision(toolCallId, customText.trim());
    } catch (err) {
      console.error("Failed to respond to decision:", err);
    }
  }, [toolCallId, customText, isAnswered, markDecisionAnswered]);

  // Answered → compact single-line showing question + selected answer
  if (isAnswered && localSelected !== undefined) {
    const answerLabel = localSelected === -1 ? customText.trim() : options[localSelected]?.label;
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

        {!customMode && (
          <button
            className="dc-option dc-custom-trigger"
            onClick={() => setCustomMode(true)}
          >
            <div className="dc-opt-body">
              <div className="dc-opt-title">自由输入...</div>
            </div>
          </button>
        )}
      </div>

      {customMode && (
        <div className="dc-custom-input">
          <input
            autoFocus
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && customText.trim()) handleCustomSubmit();
            }}
            placeholder="请输入..."
          />
          <button onClick={handleCustomSubmit} disabled={!customText.trim()}>
            确认
          </button>
        </div>
      )}
    </div>
  );
}
