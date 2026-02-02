import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FolderCard from "../../renderer/components/bookshelf/FolderCard";
import type { BookshelfItem } from "../../../preload/api";

function makeItem(overrides: Partial<BookshelfItem> = {}): BookshelfItem {
  return {
    name: "OAE_Paper.tex",
    path: "/output/OAE_Paper.tex",
    ext: ".tex",
    size: 25000,
    mtime: Date.now(),
    category: "paper",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("FolderCard", () => {
  const items = [
    makeItem({ name: "OAE_Paper.tex", path: "/output/OAE_Paper.tex" }),
    makeItem({ name: "references.bib", path: "/output/references.bib", ext: ".bib", size: 5000 }),
  ];

  it("renders folder label", () => {
    const { container } = render(<FolderCard label="论文" items={items} />);
    expect(container.querySelector(".desk-folder-title")?.textContent).toBe("论文");
  });

  it("renders file count", () => {
    render(<FolderCard label="论文" items={items} />);
    expect(screen.getByText("2 个文件")).toBeInTheDocument();
  });

  it("is closed by default", () => {
    const { container } = render(<FolderCard label="论文" items={items} />);
    expect(container.querySelector(".desk-folder.open")).toBeNull();
  });

  it("toggles open on header click", () => {
    const { container } = render(<FolderCard label="论文" items={items} />);
    const header = container.querySelector(".desk-folder-header")!;
    fireEvent.click(header);
    expect(container.querySelector(".desk-folder.open")).toBeTruthy();
  });

  it("toggles closed on second header click", () => {
    const { container } = render(<FolderCard label="论文" items={items} />);
    const header = container.querySelector(".desk-folder-header")!;
    fireEvent.click(header);
    fireEvent.click(header);
    expect(container.querySelector(".desk-folder.open")).toBeNull();
  });

  it("renders file names inside folder", () => {
    const { container } = render(<FolderCard label="论文" items={items} />);
    const fileNames = container.querySelectorAll(".desk-folder-file-name");
    const texts = Array.from(fileNames).map((el) => el.textContent);
    expect(texts).toContain("论文");
    expect(texts).toContain("引用");
  });

  it("renders file sizes for items with size > 0", () => {
    render(<FolderCard label="论文" items={items} />);
    expect(screen.getByText("4.9 KB")).toBeInTheDocument();
  });

  it("calls openFile when clicking a file row", () => {
    render(<FolderCard label="论文" items={items} />);
    const fileRow = screen.getByText("引用").closest(".desk-folder-file")!;
    fireEvent.click(fileRow);
    expect(window.api.openFile).toHaveBeenCalledWith("/output/references.bib");
  });

  it("stopPropagation prevents folder toggle when clicking file", () => {
    const { container } = render(<FolderCard label="论文" items={items} />);
    // Open the folder first
    const header = container.querySelector(".desk-folder-header")!;
    fireEvent.click(header);
    expect(container.querySelector(".desk-folder.open")).toBeTruthy();

    // Click a file — should NOT close the folder
    const fileRow = screen.getByText("引用").closest(".desk-folder-file")!;
    fireEvent.click(fileRow);
    expect(container.querySelector(".desk-folder.open")).toBeTruthy();
  });
});
