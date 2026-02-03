import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import UserPanel from "../../renderer/components/bookshelf/UserPanel";
import { useUserStore } from "../../renderer/stores/user-store";

beforeEach(() => {
  // Reset to defaults
  useUserStore.setState({
    userInfo: null,
    userName: "用户",
    userInitial: "用",
    aiName: "大师兄",
    loaded: false,
  });
});

describe("UserPanel", () => {
  it("renders default user name when no info loaded", () => {
    render(<UserPanel />);
    expect(screen.getByText("用户")).toBeInTheDocument();
  });

  it("renders default initial when no info loaded", () => {
    render(<UserPanel />);
    expect(screen.getByText("用")).toBeInTheDocument();
  });

  it("renders setup prompt when no institution/identity", () => {
    render(<UserPanel />);
    expect(screen.getByText("点击设置个人信息")).toBeInTheDocument();
  });

  it("displays user info from store", () => {
    useUserStore.setState({
      userInfo: {
        name: "测试用户",
        identity: "硕士",
        institution: "测试大学",
        researchField: "AI",
        advisor: "导师",
        project: "项目",
      },
      userName: "测试用户",
      userInitial: "测",
      loaded: true,
    });
    render(<UserPanel />);

    expect(screen.getByText("测试用户")).toBeInTheDocument();
    expect(screen.getByText("测")).toBeInTheDocument();
    expect(screen.getByText("测试大学 · 硕士")).toBeInTheDocument();
  });

  it("renders action buttons", () => {
    render(<UserPanel />);
    expect(screen.getByTitle("使用指南")).toBeInTheDocument();
    expect(screen.getByTitle("常见问题")).toBeInTheDocument();
  });

  it("shows only institution when identity is empty", () => {
    useUserStore.setState({
      userInfo: {
        name: "张三",
        identity: "",
        institution: "北京大学",
        researchField: "NLP",
        advisor: "李四",
        project: "项目",
      },
      userName: "张三",
      userInitial: "张",
      loaded: true,
    });
    render(<UserPanel />);

    expect(screen.getByText("张三")).toBeInTheDocument();
    expect(screen.getByText("北京大学")).toBeInTheDocument();
  });

  it("shows only identity when institution is empty", () => {
    useUserStore.setState({
      userInfo: {
        name: "王五",
        identity: "博士",
        institution: "",
        researchField: "CV",
        advisor: "",
        project: "",
      },
      userName: "王五",
      userInitial: "王",
      loaded: true,
    });
    render(<UserPanel />);

    expect(screen.getByText("博士")).toBeInTheDocument();
  });
});
