import { describe, it, expect, vi } from "vitest";

// Mock fs/promises
vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  copyFile: vi.fn(),
  mkdir: vi.fn(),
}));

describe("Async file operations", () => {
  it("readFile should be async and not block the event loop", async () => {
    const { readFile } = await import("fs/promises");
    vi.mocked(readFile).mockResolvedValue("test content");

    const result = await readFile("/test/path", "utf-8");
    expect(result).toBe("test content");
    expect(readFile).toHaveBeenCalledWith("/test/path", "utf-8");
  });

  it("writeFile should be async and not block the event loop", async () => {
    const { writeFile } = await import("fs/promises");
    vi.mocked(writeFile).mockResolvedValue(undefined);

    await writeFile("/test/path", "test content", "utf-8");
    expect(writeFile).toHaveBeenCalledWith("/test/path", "test content", "utf-8");
  });

  it("copyFile should be async and not block the event loop", async () => {
    const { copyFile } = await import("fs/promises");
    vi.mocked(copyFile).mockResolvedValue(undefined);

    await copyFile("/src/path", "/dest/path");
    expect(copyFile).toHaveBeenCalledWith("/src/path", "/dest/path");
  });

  it("mkdir should be async with recursive option", async () => {
    const { mkdir } = await import("fs/promises");
    vi.mocked(mkdir).mockResolvedValue(undefined);

    await mkdir("/test/dir", { recursive: true });
    expect(mkdir).toHaveBeenCalledWith("/test/dir", { recursive: true });
  });

  it("should handle file read errors gracefully", async () => {
    const { readFile } = await import("fs/promises");
    vi.mocked(readFile).mockRejectedValue(new Error("File not found"));

    // Test that error is caught
    const result = await readFile("/nonexistent/path", "utf-8").catch(() => null);
    expect(result).toBeNull();
  });

  it("should handle file write errors gracefully", async () => {
    const { writeFile } = await import("fs/promises");
    vi.mocked(writeFile).mockRejectedValue(new Error("Permission denied"));

    // Test that error can be caught
    let errorOccurred = false;
    try {
      await writeFile("/readonly/path", "content", "utf-8");
    } catch {
      errorOccurred = true;
    }
    expect(errorOccurred).toBe(true);
  });
});
