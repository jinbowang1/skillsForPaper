import React, { useState, useCallback, useEffect, useRef } from "react";
import { Check, Clock } from "lucide-react";
import { useSessionStore } from "../../stores/session-store";
import { useToastStore } from "../../stores/toast-store";
import DashixiongAvatar from "../DashixiongAvatar";

const AUTO_SELECT_TIMEOUT = 60; // seconds

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
  const [countdown, setCountdown] = useState(AUTO_SELECT_TIMEOUT);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const markDecisionAnswered = useSessionStore((s) => s.markDecisionAnswered);
  const setPendingDecision = useSessionStore((s) => s.setPendingDecision);
  const pendingDecision = useSessionStore((s) => s.pendingDecision);
  const addToast = useToastStore((s) => s.addToast);

  // Sync store → local state (when InputBar answers this decision externally)
  useEffect(() => {
    if (answered && !isAnswered) {
      setIsAnswered(true);
      if (selectedIndex !== undefined) setLocalSelected(selectedIndex);
    }
  }, [answered, selectedIndex]);

  // Auto-select timeout: countdown and auto-select recommended option
  useEffect(() => {
    if (isAnswered || options.length === 0) return;

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Auto-select first (recommended) option
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAnswered, options.length]);

  // Trigger auto-select when countdown reaches 0
  useEffect(() => {
    if (countdown === 0 && !isAnswered && options.length > 0) {
      handleSelect(0);
      addToast("已自动选择推荐选项");
    }
  }, [countdown, isAnswered, options.length]);

  const handleSelect = useCallback(
    async (index: number) => {
      if (isAnswered) return;

      setLocalSelected(index);
      setIsAnswered(true);

      const answer = options[index]?.label || "";
      markDecisionAnswered(toolCallId, index);

      try {
        await window.api.respondDecision(toolCallId, answer);
      } catch {
        addToast("回复发送失败，请重试");
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
        {countdown > 0 && countdown <= 30 && (
          <div className="dc-countdown" title="将自动选择推荐选项">
            <Clock size={12} />
            <span>{countdown}s</span>
          </div>
        )}
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
