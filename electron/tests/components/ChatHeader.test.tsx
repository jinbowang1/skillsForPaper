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
  vi.mocked(window.api.getModels).mockResolvedValue([
    { id: "MiniMax-M2.1", name: "MiniMax M2.1", needsVpn: false },
    { id: "claude-opus-4-5", name: "Claude Opus 4.5", needsVpn: true },
  ]);
  vi.mocked(window.api.setModel).mockResolvedValue({ model: "Claude Opus 4.5" });
  vi.mocked(window.api.trackFeature).mockResolvedValue(undefined);
});

describe("ChatHeader", () => {
  it("renders AI name and model selector", () => {
    render(<ChatHeader />);
    expect(screen.getByText("大师兄")).toBeInTheDocument();
    expect(screen.getByText(/MiniMax M2.1/)).toBeInTheDocument();
  });

  it("model selector button is enabled when not streaming", () => {
    render(<ChatHeader />);
    const modelBtn = screen.getByText(/MiniMax M2.1/);
    expect(modelBtn).not.toBeDisabled();
  });

  it("model selector button is disabled when streaming", () => {
    useSessionStore.setState({ isStreaming: true });
    render(<ChatHeader />);
    const modelBtn = screen.getByText(/MiniMax M2.1/);
    expect(modelBtn).toBeDisabled();
  });

  it("does not open dropdown when streaming", async () => {
    useSessionStore.setState({ isStreaming: true });
    render(<ChatHeader />);
    const modelBtn = screen.getByText(/MiniMax M2.1/);
    fireEvent.click(modelBtn);

    // Dropdown should not appear
    await waitFor(() => {
      expect(screen.queryByText("Claude Opus 4.5")).not.toBeInTheDocument();
    });
  });

  it("opens dropdown when not streaming", async () => {
    render(<ChatHeader />);
    const modelBtn = screen.getByText(/MiniMax M2.1/);
    fireEvent.click(modelBtn);

    await waitFor(() => {
      expect(screen.getByText("Claude Opus 4.5")).toBeInTheDocument();
    });
  });

  it("calls setModel when selecting a model", async () => {
    // Mock window.confirm for VPN warning
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<ChatHeader />);
    const modelBtn = screen.getByText(/MiniMax M2.1/);
    fireEvent.click(modelBtn);

    await waitFor(() => {
      expect(screen.getByText("Claude Opus 4.5")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Claude Opus 4.5"));

    await waitFor(() => {
      expect(window.api.setModel).toHaveBeenCalledWith("claude-opus-4-5");
    });
  });

  it("shows VPN tag for models that need VPN", async () => {
    render(<ChatHeader />);
    const modelBtn = screen.getByText(/MiniMax M2.1/);
    fireEvent.click(modelBtn);

    await waitFor(() => {
      expect(screen.getByText("需VPN")).toBeInTheDocument();
    });
  });
});
