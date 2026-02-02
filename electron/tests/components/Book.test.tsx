import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Book from "../../renderer/components/bookshelf/Book";
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

describe("Book", () => {
  it("renders display name for known file names", () => {
    render(<Book item={makeItem()} />);
    expect(screen.getByText("论文")).toBeInTheDocument();
  });

  it("renders display name mapping for OPENING_REPORT", () => {
    render(<Book item={makeItem({ name: "OPENING_REPORT.md", ext: ".md" })} />);
    expect(screen.getByText("开题报告")).toBeInTheDocument();
  });

  it("renders base name for unknown file names", () => {
    render(<Book item={makeItem({ name: "custom_file.py", ext: ".py" })} />);
    expect(screen.getByText("custom_file")).toBeInTheDocument();
  });

  it("renders file extension", () => {
    render(<Book item={makeItem()} />);
    expect(screen.getByText(".tex")).toBeInTheDocument();
  });

  it("renders tooltip with original filename", () => {
    render(<Book item={makeItem()} />);
    expect(screen.getByText("OAE_Paper.tex")).toBeInTheDocument();
  });

  it("applies correct color via CSS variable for .tex", () => {
    const { container } = render(<Book item={makeItem()} />);
    const bookEl = container.querySelector(".book") as HTMLElement;
    expect(bookEl.style.getPropertyValue("--c")).toBe("#6E8AFA");
  });

  it("applies correct color for .pdf", () => {
    const { container } = render(
      <Book item={makeItem({ name: "paper.pdf", ext: ".pdf" })} />
    );
    const bookEl = container.querySelector(".book") as HTMLElement;
    expect(bookEl.style.getPropertyValue("--c")).toBe("#E06070");
  });

  it("uses fallback color for unknown extensions", () => {
    const { container } = render(
      <Book item={makeItem({ name: "file.xyz", ext: ".xyz" })} />
    );
    const bookEl = container.querySelector(".book") as HTMLElement;
    expect(bookEl.style.getPropertyValue("--c")).toBe("#5B8AB5");
  });

  it("applies 'thin' class for small files", () => {
    const { container } = render(
      <Book item={makeItem({ size: 500 })} />
    );
    expect(container.querySelector(".book.thin")).toBeTruthy();
  });

  it("does not apply 'thin' class for large files", () => {
    const { container } = render(
      <Book item={makeItem({ size: 60000 })} />
    );
    const bookEl = container.querySelector(".book");
    expect(bookEl?.classList.contains("thin")).toBe(false);
  });

  it("applies 'active' class when isActive is true", () => {
    const { container } = render(
      <Book item={makeItem({ isActive: true })} />
    );
    expect(container.querySelector(".book.active")).toBeTruthy();
  });

  it("calls openFile on click", () => {
    render(<Book item={makeItem()} />);
    const bookEl = screen.getByText("论文").closest(".book")!;
    fireEvent.click(bookEl);
    expect(window.api.openFile).toHaveBeenCalledWith("/output/OAE_Paper.tex");
  });

  it("sets dimension CSS variables based on file size", () => {
    // Large file (>50000) → w=20, h=145
    const { container } = render(
      <Book item={makeItem({ size: 60000 })} />
    );
    const bookEl = container.querySelector(".book") as HTMLElement;
    expect(bookEl.style.getPropertyValue("--w")).toBe("20px");
    expect(bookEl.style.getPropertyValue("--h")).toBe("145px");
  });

  it("sets smaller dimensions for small files", () => {
    // Tiny file (<=1000) → w=11, h=95
    const { container } = render(
      <Book item={makeItem({ size: 500 })} />
    );
    const bookEl = container.querySelector(".book") as HTMLElement;
    expect(bookEl.style.getPropertyValue("--w")).toBe("11px");
    expect(bookEl.style.getPropertyValue("--h")).toBe("95px");
  });
});
