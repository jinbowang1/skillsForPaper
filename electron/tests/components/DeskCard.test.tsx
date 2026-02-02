import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DeskCard from "../../renderer/components/bookshelf/DeskCard";
import type { BookshelfItem } from "../../../preload/api";

function makeItem(overrides: Partial<BookshelfItem> = {}): BookshelfItem {
  return {
    name: "OAE_Paper.tex",
    path: "/output/OAE_Paper.tex",
    ext: ".tex",
    size: 25000,
    mtime: Date.now() - 3600000,
    category: "paper",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DeskCard", () => {
  it("renders display name for known files", () => {
    render(<DeskCard item={makeItem()} />);
    expect(screen.getByText("论文")).toBeInTheDocument();
  });

  it("renders file size and relative time in meta", () => {
    render(<DeskCard item={makeItem()} />);
    // Should show size (≈24.4 KB) and "1 小时前"
    expect(screen.getByText(/KB/)).toBeInTheDocument();
  });

  it("calls openFile on click", () => {
    render(<DeskCard item={makeItem()} />);
    const card = screen.getByText("论文").closest(".desk-card")!;
    fireEvent.click(card);
    expect(window.api.openFile).toHaveBeenCalledWith("/output/OAE_Paper.tex");
  });

  it("renders icon for known extension", () => {
    const { container } = render(<DeskCard item={makeItem()} />);
    expect(container.querySelector(".desk-card-icon")).toBeTruthy();
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("applies active class when isActive", () => {
    const { container } = render(
      <DeskCard item={makeItem({ isActive: true })} />
    );
    expect(container.querySelector(".desk-card.active")).toBeTruthy();
  });

  it("shows 关注 tag when isActive", () => {
    render(<DeskCard item={makeItem({ isActive: true })} />);
    expect(screen.getByText("关注")).toBeInTheDocument();
  });

  it("shows 最新 tag for recently modified files", () => {
    render(
      <DeskCard item={makeItem({ mtime: Date.now() - 30000 })} />
    );
    expect(screen.getByText("最新")).toBeInTheDocument();
  });

  it("renders base name for unknown files", () => {
    render(
      <DeskCard item={makeItem({ name: "custom_report.py", ext: ".py" })} />
    );
    expect(screen.getByText("custom_report")).toBeInTheDocument();
  });

  it("does not show size when size is 0", () => {
    const { container } = render(
      <DeskCard item={makeItem({ size: 0 })} />
    );
    const meta = container.querySelector(".desk-card-meta")!;
    expect(meta.textContent).not.toContain("0 B");
  });
});
