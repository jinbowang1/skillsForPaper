import { describe, it, expect, vi, beforeEach } from "vitest";
import { useUserStore } from "../../renderer/stores/user-store";

beforeEach(() => {
  useUserStore.setState({
    userInfo: null,
    userName: "用户",
    userInitial: "用",
    aiName: "大师兄",
    loaded: false,
  });
  vi.clearAllMocks();
  // Restore default mock
  vi.mocked(window.api.getUserInfo).mockResolvedValue({
    name: "测试用户",
    identity: "硕士",
    institution: "测试大学",
    researchField: "AI",
    advisor: "导师",
    project: "项目",
  });
});

describe("useUserStore", () => {
  it("has correct default state", () => {
    const state = useUserStore.getState();
    expect(state.userName).toBe("用户");
    expect(state.userInitial).toBe("用");
    expect(state.aiName).toBe("大师兄");
    expect(state.userInfo).toBeNull();
    expect(state.loaded).toBe(false);
  });

  it("fetchUserInfo loads user data", async () => {
    await useUserStore.getState().fetchUserInfo();

    const state = useUserStore.getState();
    expect(state.userName).toBe("测试用户");
    expect(state.userInitial).toBe("测");
    expect(state.loaded).toBe(true);
    expect(state.userInfo?.institution).toBe("测试大学");
  });

  it("fetchUserInfo only calls API once", async () => {
    await useUserStore.getState().fetchUserInfo();
    await useUserStore.getState().fetchUserInfo();

    expect(window.api.getUserInfo).toHaveBeenCalledTimes(1);
  });

  it("fetchUserInfo handles API error gracefully", async () => {
    vi.mocked(window.api.getUserInfo).mockRejectedValueOnce(new Error("fail"));

    await useUserStore.getState().fetchUserInfo();

    const state = useUserStore.getState();
    expect(state.loaded).toBe(true);
    expect(state.userName).toBe("用户"); // keeps default
    expect(state.userInfo).toBeNull();
  });

  it("uses first character of name as initial", async () => {
    vi.mocked(window.api.getUserInfo).mockResolvedValueOnce({
      name: "王小明",
      identity: "博士",
      institution: "清华大学",
      researchField: "ML",
      advisor: "",
      project: "",
    });

    await useUserStore.getState().fetchUserInfo();
    expect(useUserStore.getState().userInitial).toBe("王");
  });

  it("falls back to 用户 when name is empty", async () => {
    vi.mocked(window.api.getUserInfo).mockResolvedValueOnce({
      name: "",
      identity: "",
      institution: "",
      researchField: "",
      advisor: "",
      project: "",
    });

    await useUserStore.getState().fetchUserInfo();
    expect(useUserStore.getState().userName).toBe("用户");
  });
});
