import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ChatHeader from "../../renderer/components/chat/ChatHeader";
import { useSessionStore } from "../../renderer/stores/session-store";
import { useUserStore } from "../../renderer/stores/user-store";

beforeEach(() => {
  useSessionStore.setState({
    messages: [],
    isStreaming: false,
    agentState: "idle",
    currentModel: "MiniMax M2.1",
    currentModelSupportsImages: true,
  });
  useUserStore.setState({
    userInfo: null,
    userName: "用户",
    userInitial: "用",
    aiName: "大师兄",
    loaded: false,
  });
  vi.clearAllMocks();
});

describe("ChatHeader", () => {
  it("renders AI name", () => {
    render(<ChatHeader />);
    expect(screen.getByText("大师兄")).toBeInTheDocument();
  });

  it("renders new chat button", () => {
    render(<ChatHeader />);
    expect(screen.getByText("新建对话")).toBeInTheDocument();
  });

  it("new chat button is disabled when streaming", () => {
    useSessionStore.setState({ isStreaming: true });
    render(<ChatHeader />);
    expect(screen.getByText("新建对话")).toBeDisabled();
  });

  it("new chat button is enabled when not streaming", () => {
    render(<ChatHeader />);
    expect(screen.getByText("新建对话")).not.toBeDisabled();
  });

  it("does not show model selector", () => {
    render(<ChatHeader />);
    expect(screen.queryByText(/MiniMax M2.1/)).not.toBeInTheDocument();
  });

  it("calls newSession on new chat confirm", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<ChatHeader />);
    fireEvent.click(screen.getByText("新建对话"));

    await waitFor(() => {
      expect(window.api.clearChatHistory).toHaveBeenCalled();
      expect(window.api.newSession).toHaveBeenCalled();
    });
  });

  it("does not call newSession when confirm is cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<ChatHeader />);
    fireEvent.click(screen.getByText("新建对话"));

    await waitFor(() => {
      expect(window.api.newSession).not.toHaveBeenCalled();
    });
  });
});
