import { describe, it, expect, beforeEach } from "vitest";
import { useSessionStore, generateMsgId } from "../../renderer/stores/session-store";
import type { ChatMessage, ContentBlock } from "../../renderer/stores/session-store";

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: generateMsgId(),
    role: "user",
    blocks: [{ type: "text", text: "hello" }],
    timestamp: Date.now(),
    ...overrides,
  };
}

describe("generateMsgId", () => {
  it("returns a string starting with 'msg-'", () => {
    const id = generateMsgId();
    expect(id).toMatch(/^msg-\d+-\d+$/);
  });

  it("generates unique ids", () => {
    const ids = new Set(Array.from({ length: 10 }, () => generateMsgId()));
    expect(ids.size).toBe(10);
  });
});

describe("useSessionStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    useSessionStore.setState({
      messages: [],
      isStreaming: false,
      agentState: "idle",
      currentModel: "Claude Opus 4.5",
    });
  });

  describe("addMessage", () => {
    it("adds a message to the store", () => {
      const msg = makeMessage();
      useSessionStore.getState().addMessage(msg);
      expect(useSessionStore.getState().messages).toHaveLength(1);
      expect(useSessionStore.getState().messages[0]).toEqual(msg);
    });

    it("appends messages in order", () => {
      const msg1 = makeMessage({ role: "user" });
      const msg2 = makeMessage({ role: "assistant" });
      useSessionStore.getState().addMessage(msg1);
      useSessionStore.getState().addMessage(msg2);
      const messages = useSessionStore.getState().messages;
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe("user");
      expect(messages[1].role).toBe("assistant");
    });
  });

  describe("updateLastAssistantMessage", () => {
    it("updates blocks of the last assistant message", () => {
      useSessionStore.getState().addMessage(makeMessage({ role: "user" }));
      useSessionStore.getState().addMessage(
        makeMessage({ role: "assistant", blocks: [{ type: "text", text: "hi" }] })
      );

      useSessionStore.getState().updateLastAssistantMessage((blocks) => {
        return [...blocks, { type: "text", text: " world" }];
      });

      const msgs = useSessionStore.getState().messages;
      const lastAssistant = msgs.find((m) => m.role === "assistant");
      expect(lastAssistant?.blocks).toHaveLength(2);
      expect(lastAssistant?.blocks[1].text).toBe(" world");
    });

    it("finds the last assistant message even with trailing user messages", () => {
      useSessionStore.getState().addMessage(
        makeMessage({ role: "assistant", blocks: [{ type: "text", text: "first" }] })
      );
      useSessionStore.getState().addMessage(makeMessage({ role: "user" }));

      useSessionStore.getState().updateLastAssistantMessage((blocks) => {
        return blocks.map((b) => ({ ...b, text: "updated" }));
      });

      const msgs = useSessionStore.getState().messages;
      expect(msgs[0].blocks[0].text).toBe("updated");
    });
  });

  describe("appendToLastTextBlock", () => {
    it("appends text to the last text block of the last assistant message", () => {
      useSessionStore.getState().addMessage(
        makeMessage({
          role: "assistant",
          blocks: [{ type: "text", text: "Hello" }],
        })
      );

      useSessionStore.getState().appendToLastTextBlock(" world");

      const msgs = useSessionStore.getState().messages;
      expect(msgs[0].blocks[0].text).toBe("Hello world");
    });

    it("creates a new text block if none exists", () => {
      useSessionStore.getState().addMessage(
        makeMessage({
          role: "assistant",
          blocks: [{ type: "thinking", text: "hmm" }],
        })
      );

      useSessionStore.getState().appendToLastTextBlock("new text");

      const msgs = useSessionStore.getState().messages;
      expect(msgs[0].blocks).toHaveLength(2);
      expect(msgs[0].blocks[1]).toEqual({ type: "text", text: "new text" });
    });

    it("appends to the last text block, not the first", () => {
      useSessionStore.getState().addMessage(
        makeMessage({
          role: "assistant",
          blocks: [
            { type: "text", text: "first" },
            { type: "thinking", text: "..." },
            { type: "text", text: "second" },
          ],
        })
      );

      useSessionStore.getState().appendToLastTextBlock("!");

      const msgs = useSessionStore.getState().messages;
      expect(msgs[0].blocks[0].text).toBe("first");
      expect(msgs[0].blocks[2].text).toBe("second!");
    });
  });

  describe("setStreaming", () => {
    it("sets streaming state", () => {
      useSessionStore.getState().setStreaming(true);
      expect(useSessionStore.getState().isStreaming).toBe(true);

      useSessionStore.getState().setStreaming(false);
      expect(useSessionStore.getState().isStreaming).toBe(false);
    });
  });

  describe("setAgentState", () => {
    it("sets agent state", () => {
      useSessionStore.getState().setAgentState("working");
      expect(useSessionStore.getState().agentState).toBe("working");

      useSessionStore.getState().setAgentState("thinking");
      expect(useSessionStore.getState().agentState).toBe("thinking");

      useSessionStore.getState().setAgentState("idle");
      expect(useSessionStore.getState().agentState).toBe("idle");
    });
  });

  describe("setModel", () => {
    it("sets current model", () => {
      useSessionStore.getState().setModel("Claude Sonnet");
      expect(useSessionStore.getState().currentModel).toBe("Claude Sonnet");
    });
  });

  describe("markDecisionAnswered", () => {
    it("marks a decision block as answered", () => {
      useSessionStore.getState().addMessage(
        makeMessage({
          role: "assistant",
          blocks: [
            {
              type: "decision",
              toolCallId: "tc-123",
              question: "Which option?",
              options: [{ label: "A" }, { label: "B" }],
            },
          ],
        })
      );

      useSessionStore.getState().markDecisionAnswered("tc-123", 1);

      const msgs = useSessionStore.getState().messages;
      const decisionBlock = msgs[0].blocks[0];
      expect(decisionBlock.answered).toBe(true);
      expect(decisionBlock.selectedIndex).toBe(1);
    });

    it("does not affect other blocks", () => {
      useSessionStore.getState().addMessage(
        makeMessage({
          role: "assistant",
          blocks: [
            { type: "text", text: "some text" },
            {
              type: "decision",
              toolCallId: "tc-456",
              question: "Pick one",
              options: [{ label: "X" }],
            },
          ],
        })
      );

      useSessionStore.getState().markDecisionAnswered("tc-456", 0);

      const msgs = useSessionStore.getState().messages;
      expect(msgs[0].blocks[0].type).toBe("text");
      expect(msgs[0].blocks[0].answered).toBeUndefined();
      expect(msgs[0].blocks[1].answered).toBe(true);
    });

    it("only marks the matching toolCallId", () => {
      useSessionStore.getState().addMessage(
        makeMessage({
          role: "assistant",
          blocks: [
            { type: "decision", toolCallId: "tc-a", question: "Q1", options: [] },
            { type: "decision", toolCallId: "tc-b", question: "Q2", options: [] },
          ],
        })
      );

      useSessionStore.getState().markDecisionAnswered("tc-a", 0);

      const msgs = useSessionStore.getState().messages;
      expect(msgs[0].blocks[0].answered).toBe(true);
      expect(msgs[0].blocks[1].answered).toBeUndefined();
    });
  });
});
