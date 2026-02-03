import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SuggestionBar from "../../renderer/components/chat/SuggestionBar";
import { useSessionStore } from "../../renderer/stores/session-store";

beforeEach(() => {
  useSessionStore.setState({
    messages: [],
    isStreaming: false,
    agentState: "idle",
    currentModel: "Claude Opus 4.5",
  });
  vi.clearAllMocks();
  vi.mocked(window.api.prompt).mockResolvedValue(undefined);
});

describe("SuggestionBar", () => {
  it("renders welcome suggestions when no messages", () => {
    render(<SuggestionBar />);
    expect(screen.getByText("有什么我能帮你的？")).toBeInTheDocument();
    expect(screen.getByText("创新点挖掘")).toBeInTheDocument();
    expect(screen.getByText("实验设计")).toBeInTheDocument();
    expect(screen.getByText("代码编写与执行")).toBeInTheDocument();
    expect(screen.getByText("智能润色")).toBeInTheDocument();
    expect(screen.getByText("生成目标期刊pdf")).toBeInTheDocument();
  });

  it("hides when there are messages", () => {
    useSessionStore.setState({
      messages: [
        {
          id: "msg-1",
          role: "user",
          blocks: [{ type: "text", text: "hello" }],
          timestamp: Date.now(),
        },
      ],
    });
    const { container } = render(<SuggestionBar />);
    expect(container.innerHTML).toBe("");
  });

  it("sends text when a suggestion pill is clicked", async () => {
    render(<SuggestionBar />);
    fireEvent.click(screen.getByText("创新点挖掘"));
    await waitFor(() => {
      expect(window.api.prompt).toHaveBeenCalledWith("帮我进行创新点挖掘", undefined);
    });
  });

  it("renders all 5 suggestion pills", () => {
    const { container } = render(<SuggestionBar />);
    const pills = container.querySelectorAll(".suggestion-pill");
    expect(pills).toHaveLength(5);
  });
});
