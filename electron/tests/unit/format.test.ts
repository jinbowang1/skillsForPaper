import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatFileSize,
  formatTime,
  formatRelativeTime,
  getExtClass,
  getFileIcon,
} from "../../renderer/utils/format";

describe("formatFileSize", () => {
  it("returns '0 B' for 0 bytes", () => {
    expect(formatFileSize(0)).toBe("0 B");
  });

  it("formats bytes", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("formats kilobytes with one decimal for small values", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
    expect(formatFileSize(5120)).toBe("5.0 KB");
  });

  it("formats kilobytes without decimal for values >= 10", () => {
    expect(formatFileSize(10240)).toBe("10 KB");
    expect(formatFileSize(102400)).toBe("100 KB");
  });

  it("formats megabytes", () => {
    expect(formatFileSize(1048576)).toBe("1.0 MB");
    expect(formatFileSize(1572864)).toBe("1.5 MB");
  });

  it("formats gigabytes", () => {
    expect(formatFileSize(1073741824)).toBe("1.0 GB");
  });
});

describe("formatTime", () => {
  it("formats timestamp to HH:mm", () => {
    // Create a known date: 2024-01-15 14:30 in local timezone
    const date = new Date(2024, 0, 15, 14, 30, 0);
    const result = formatTime(date.getTime());
    expect(result).toBe("14:30");
  });

  it("formats midnight correctly", () => {
    const date = new Date(2024, 0, 15, 0, 5, 0);
    const result = formatTime(date.getTime());
    expect(result).toBe("00:05");
  });
});

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 5, 15, 12, 0, 0)); // 2024-06-15 12:00:00
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns '刚刚' for less than 1 minute ago", () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 30000)).toBe("刚刚"); // 30 seconds ago
  });

  it("returns minutes for 1-59 minutes ago", () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 5 * 60000)).toBe("5 分钟前");
    expect(formatRelativeTime(now - 59 * 60000)).toBe("59 分钟前");
  });

  it("returns hours for 1-23 hours ago", () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 3600000)).toBe("1 小时前");
    expect(formatRelativeTime(now - 5 * 3600000)).toBe("5 小时前");
  });

  it("returns days for 1-6 days ago", () => {
    const now = Date.now();
    expect(formatRelativeTime(now - 86400000)).toBe("1 天前");
    expect(formatRelativeTime(now - 3 * 86400000)).toBe("3 天前");
  });

  it("returns formatted date for 7+ days ago", () => {
    const now = Date.now();
    const result = formatRelativeTime(now - 10 * 86400000);
    // Should return a date string like "6/5" in zh-CN locale
    expect(result).toBeTruthy();
    expect(result).not.toContain("天前");
  });
});

describe("getExtClass", () => {
  it("maps known extensions", () => {
    expect(getExtClass(".py")).toBe("py");
    expect(getExtClass(".json")).toBe("json");
    expect(getExtClass(".csv")).toBe("csv");
    expect(getExtClass(".png")).toBe("png");
    expect(getExtClass(".jpg")).toBe("png");
    expect(getExtClass(".svg")).toBe("png");
    expect(getExtClass(".pdf")).toBe("pdf");
    expect(getExtClass(".tex")).toBe("tex");
    expect(getExtClass(".md")).toBe("md");
    expect(getExtClass(".bib")).toBe("bib");
    expect(getExtClass(".docx")).toBe("md");
  });

  it("returns 'md' for unknown extensions", () => {
    expect(getExtClass(".xyz")).toBe("md");
    expect(getExtClass(".rs")).toBe("md");
  });
});

describe("getFileIcon", () => {
  it("maps known extensions to icon names", () => {
    expect(getFileIcon(".py")).toBe("FileCode");
    expect(getFileIcon(".json")).toBe("FileJson");
    expect(getFileIcon(".csv")).toBe("FileSpreadsheet");
    expect(getFileIcon(".png")).toBe("Image");
    expect(getFileIcon(".jpg")).toBe("Image");
    expect(getFileIcon(".svg")).toBe("Image");
    expect(getFileIcon(".pdf")).toBe("FileText");
    expect(getFileIcon(".tex")).toBe("FileText");
    expect(getFileIcon(".md")).toBe("FileText");
    expect(getFileIcon(".bib")).toBe("BookOpen");
    expect(getFileIcon(".docx")).toBe("FileText");
  });

  it("returns 'File' for unknown extensions", () => {
    expect(getFileIcon(".xyz")).toBe("File");
    expect(getFileIcon(".rs")).toBe("File");
  });
});
