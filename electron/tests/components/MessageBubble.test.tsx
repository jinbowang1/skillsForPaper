import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import MessageBubble from "../../renderer/components/chat/MessageBubble";
import { useUserStore } from "../../renderer/stores/user-store";
import type { ChatMessage } from "../../renderer/stores/session-store";

function makeMsg(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: "msg-1",
    role: "user",
    blocks: [{ type: "text", text: "Hello" }],
    timestamp: new Date(2024, 5, 15, 14, 30).getTime(),
    ...overrides,
  };
}

beforeEach(() => {
  // Set known user info in store for predictable assertions
  useUserStore.setState({
    userInfo: null,
    userName: "测试用户",
    userInitial: "测",
    aiName: "大师兄",
    loaded: true,
  });
});

describe("MessageBubble", () => {
  describe("user messages", () => {
    it("renders user message text", () => {
      render(<MessageBubble message={makeMsg()} />);
      expect(screen.getByText("Hello")).toBeInTheDocument();
    });

    it("shows user avatar initial from store", () => {
      render(<MessageBubble message={makeMsg()} />);
      expect(screen.getByText("测")).toBeInTheDocument();
    });

    it("shows user name from store", () => {
      render(<MessageBubble message={makeMsg()} />);
      expect(screen.getByText("测试用户")).toBeInTheDocument();
    });

    it("shows formatted timestamp", () => {
      render(<MessageBubble message={makeMsg()} />);
      expect(screen.getByText("14:30")).toBeInTheDocument();
    });

    it("applies from-user class", () => {
      const { container } = render(<MessageBubble message={makeMsg()} />);
      expect(container.querySelector(".from-user")).toBeTruthy();
    });
  });

  describe("assistant messages", () => {
    it("renders AI message text", () => {
      render(
        <MessageBubble
          message={makeMsg({ role: "assistant", blocks: [{ type: "text", text: "Hi there" }] })}
        />
      );
      expect(screen.getByText("Hi there")).toBeInTheDocument();
    });

    it("shows AI name from store", () => {
      render(
        <MessageBubble
          message={makeMsg({ role: "assistant", blocks: [{ type: "text", text: "test" }] })}
        />
      );
      expect(screen.getByText("大师兄")).toBeInTheDocument();
    });

    it("applies from-ai class", () => {
      const { container } = render(
        <MessageBubble
          message={makeMsg({ role: "assistant", blocks: [{ type: "text", text: "test" }] })}
        />
      );
      expect(container.querySelector(".from-ai")).toBeTruthy();
    });

    it("renders markdown for non-streaming AI messages", () => {
      const { container } = render(
        <MessageBubble
          message={makeMsg({
            role: "assistant",
            blocks: [{ type: "text", text: "**bold text**" }],
            isStreaming: false,
          })}
        />
      );
      const strong = container.querySelector("strong");
      expect(strong).toBeTruthy();
      expect(strong?.textContent).toBe("bold text");
    });

    it("renders plain text for streaming AI messages", () => {
      const { container } = render(
        <MessageBubble
          message={makeMsg({
            role: "assistant",
            blocks: [{ type: "text", text: "**still plain**" }],
            isStreaming: true,
          })}
        />
      );
      expect(container.querySelector("strong")).toBeNull();
      expect(screen.getByText("**still plain**")).toBeInTheDocument();
    });

    it("shows loading dots when streaming with no content", () => {
      const { container } = render(
        <MessageBubble
          message={makeMsg({
            role: "assistant",
            blocks: [],
            isStreaming: true,
          })}
        />
      );
      expect(container.querySelector(".streaming-dots")).toBeTruthy();
    });
  });

  describe("special blocks", () => {
    it("renders tool cards for tool blocks", () => {
      const { container } = render(
        <MessageBubble
          message={makeMsg({
            role: "assistant",
            blocks: [
              {
                type: "tool",
                toolName: "bash",
                toolStatus: "running",
                text: "执行命令",
              },
            ],
          })}
        />
      );
      expect(container.querySelector(".tool-group")).toBeTruthy();
    });

    it("renders thinking block", () => {
      const { container } = render(
        <MessageBubble
          message={makeMsg({
            role: "assistant",
            blocks: [{ type: "thinking", text: "Let me think..." }],
          })}
        />
      );
      expect(screen.getByText("Let me think...")).toBeInTheDocument();
    });

    it("does not render bubble when there is no text content", () => {
      const { container } = render(
        <MessageBubble
          message={makeMsg({
            role: "assistant",
            blocks: [{ type: "tool", toolName: "bash", toolStatus: "done" }],
          })}
        />
      );
      expect(container.querySelector(".bubble")).toBeNull();
    });

    it("combines multiple text blocks into one", () => {
      render(
        <MessageBubble
          message={makeMsg({
            role: "assistant",
            blocks: [
              { type: "text", text: "Part 1" },
              { type: "text", text: " Part 2" },
            ],
            isStreaming: true,
          })}
        />
      );
      expect(screen.getByText("Part 1 Part 2")).toBeInTheDocument();
    });
  });
});
