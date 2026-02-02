export interface Suggestion {
  label: string;    // 显示文本
  sendText: string; // 实际发送的文本
}

/**
 * 根据最后一条 assistant 消息的上下文生成简短快捷回复。
 * 用于 InputBar 内右侧的小 chips（"继续"/"好的" 等）。
 */
export function parseFallbackSuggestions(
  text: string,
  isStreaming: boolean
): Suggestion[] {
  if (isStreaming || !text) return [];

  const trimmed = text.trim();
  if (trimmed.endsWith("？") || trimmed.endsWith("?")) {
    return [
      { label: "好的", sendText: "好的" },
      { label: "不用了", sendText: "不用了" },
      { label: "详细说说", sendText: "详细说说" },
    ];
  }
  return [
    { label: "继续", sendText: "继续" },
    { label: "好的", sendText: "好的" },
  ];
}
