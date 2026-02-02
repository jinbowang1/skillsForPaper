import { describe, it, expect } from "vitest";
import { parseFallbackSuggestions } from "../../renderer/utils/parseSuggestions";

describe("parseFallbackSuggestions", () => {
  it("returns empty array when streaming", () => {
    expect(parseFallbackSuggestions("some text", true)).toEqual([]);
  });

  it("returns empty array for empty text", () => {
    expect(parseFallbackSuggestions("", false)).toEqual([]);
  });

  it("returns question suggestions when text ends with ？", () => {
    const result = parseFallbackSuggestions("你需要帮助吗？", false);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ label: "好的", sendText: "好的" });
    expect(result[1]).toEqual({ label: "不用了", sendText: "不用了" });
    expect(result[2]).toEqual({ label: "详细说说", sendText: "详细说说" });
  });

  it("returns question suggestions when text ends with ?", () => {
    const result = parseFallbackSuggestions("Do you need help?", false);
    expect(result).toHaveLength(3);
    expect(result[0].label).toBe("好的");
  });

  it("returns default suggestions for non-question text", () => {
    const result = parseFallbackSuggestions("已经完成了任务。", false);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ label: "继续", sendText: "继续" });
    expect(result[1]).toEqual({ label: "好的", sendText: "好的" });
  });

  it("trims text before checking question mark", () => {
    const result = parseFallbackSuggestions("  你好吗？  ", false);
    expect(result).toHaveLength(3);
  });

  it("handles text with only whitespace", () => {
    expect(parseFallbackSuggestions("   ", false)).toHaveLength(2);
  });
});
