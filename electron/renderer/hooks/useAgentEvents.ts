import { useEffect } from "react";
import {
  useSessionStore,
  generateMsgId,
  type ContentBlock,
} from "../stores/session-store";
import { useToastStore } from "../stores/toast-store";
import { parseAgentEvent } from "../utils/message-parser";

export function useAgentEvents() {
  const {
    addMessage,
    updateLastAssistantMessage,
    appendToLastTextBlock,
    setStreaming,
    setAgentState,
    setModel,
    setModelSupportsImages,
  } = useSessionStore();

  useEffect(() => {
    const unsubEvent = window.api.onAgentEvent((event: any) => {
      // Handle tool timeout event
      if (event.type === "tool_timeout") {
        useToastStore.getState().addToast(event.message || "工具执行超时，正在尝试其他方法...");
        return;
      }

      const parsed = parseAgentEvent(event);
      if (!parsed) return;

      switch (parsed.action) {
        case "new_assistant_message": {
          // Only create if there isn't already a streaming assistant message
          // (InputBar pre-creates one; this is a fallback)
          const msgs = useSessionStore.getState().messages;
          const last = msgs[msgs.length - 1];
          if (!last || last.role !== "assistant" || !last.isStreaming) {
            addMessage({
              id: generateMsgId(),
              role: "assistant",
              blocks: [],
              timestamp: Date.now(),
              isStreaming: true,
            });
          }
          break;
        }

        case "append_text":
          if (parsed.text) {
            appendToLastTextBlock(parsed.text);
          }
          break;

        case "add_block":
          if (parsed.block) {
            updateLastAssistantMessage((blocks) => [...blocks, parsed.block!]);
          }
          break;

        case "update_last_block":
          if (parsed.block) {
            updateLastAssistantMessage((blocks) => {
              if (blocks.length === 0) return [parsed.block!];
              const last = blocks[blocks.length - 1];
              if (last.type === parsed.block!.type) {
                // Append text (for thinking deltas) instead of replacing
                return [...blocks.slice(0, -1), {
                  ...last,
                  text: (last.text || "") + (parsed.block!.text || ""),
                }];
              }
              return [...blocks, parsed.block!];
            });
          }
          break;

        case "complete_tool":
          if (parsed.toolCallId) {
            updateLastAssistantMessage((blocks) => {
              // Update the matching tool block to done/error
              const updated = blocks.map((b) => {
                if (b.type === "tool" && b.toolCallId === parsed.toolCallId) {
                  return {
                    ...b,
                    toolStatus: (parsed.isError ? "error" : "done") as "running" | "done" | "error",
                    toolResult: parsed.result,
                    isError: parsed.isError,
                  };
                }
                return b;
              });
              // For write/edit tools, also add a file card
              if (parsed.fileBlock) {
                updated.push(parsed.fileBlock);
              }
              return updated;
            });
          }
          break;

        case "end_message":
          // Mark the assistant message as no longer streaming
          updateLastAssistantMessage((blocks) =>
            blocks.map((b) => ({ ...b }))
          );
          // Also clear isStreaming on the message itself
          {
            const msgs = useSessionStore.getState().messages;
            for (let i = msgs.length - 1; i >= 0; i--) {
              if (msgs[i].role === "assistant" && msgs[i].isStreaming) {
                useSessionStore.setState({
                  messages: msgs.map((m, idx) =>
                    idx === i ? { ...m, isStreaming: false } : m
                  ),
                });
                break;
              }
            }
          }
          break;
      }
    });

    const unsubState = window.api.onStateChange((state: any) => {
      setStreaming(state.isStreaming);
      if (state.state === "error") {
        setAgentState("idle");
        // Clear stuck streaming on assistant messages
        const msgs = useSessionStore.getState().messages;
        for (let i = msgs.length - 1; i >= 0; i--) {
          if (msgs[i].role === "assistant" && msgs[i].isStreaming) {
            useSessionStore.setState({
              messages: msgs.map((m, idx) =>
                idx === i ? { ...m, isStreaming: false } : m
              ),
            });
            break;
          }
        }
      } else {
        setAgentState(state.isStreaming ? "working" : "idle");
      }
      if (state.model) {
        setModel(state.model);
      }
      if (state.supportsImages !== undefined) {
        setModelSupportsImages(state.supportsImages);
      }
    });

    // Initialize model name from current session state
    // (may return "unknown" if session hasn't initialized yet;
    //  the "ready" state-change event will correct it)
    window.api.getState().then((s) => {
      if (s.model && s.model !== "unknown") {
        setModel(s.model);
      }
      if (s.supportsImages !== undefined) {
        setModelSupportsImages(s.supportsImages);
      }
    }).catch(() => {});

    const unsubDecision = window.api.onDecisionRequest((req) => {
      // Add decision card to messages
      const block: ContentBlock = {
        type: "decision",
        toolCallId: req.toolCallId,
        question: req.question,
        options: req.options,
        answered: false,
      };
      updateLastAssistantMessage((blocks) => [...blocks, block]);
    });

    return () => {
      unsubEvent();
      unsubState();
      unsubDecision();
    };
  }, []);
}
