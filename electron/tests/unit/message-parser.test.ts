import { describe, it, expect } from "vitest";
import {
  parseAgentEvent,
  extractCodeBlocks,
  extractCitations,
} from "../../renderer/utils/message-parser";

describe("parseAgentEvent", () => {
  it("returns null for null/undefined input", () => {
    expect(parseAgentEvent(null)).toBeNull();
    expect(parseAgentEvent(undefined)).toBeNull();
  });

  it("returns null for event without type", () => {
    expect(parseAgentEvent({})).toBeNull();
    expect(parseAgentEvent({ foo: "bar" })).toBeNull();
  });

  // agent_start
  it("returns new_assistant_message for agent_start", () => {
    const result = parseAgentEvent({ type: "agent_start" });
    expect(result).toEqual({ action: "new_assistant_message" });
  });

  // turn_start
  it("returns new_assistant_message for turn_start", () => {
    const result = parseAgentEvent({ type: "turn_start" });
    expect(result).toEqual({ action: "new_assistant_message" });
  });

  // agent_end
  it("returns end_message for agent_end", () => {
    const result = parseAgentEvent({ type: "agent_end", messages: [] });
    expect(result).toEqual({ action: "end_message" });
  });

  // message_update with text_start
  it("handles text_start event", () => {
    const result = parseAgentEvent({
      type: "message_update",
      assistantMessageEvent: { type: "text_start" },
    });
    expect(result).toEqual({
      action: "add_block",
      block: { type: "text", text: "" },
    });
  });

  // message_update with text_delta
  it("handles text_delta event", () => {
    const result = parseAgentEvent({
      type: "message_update",
      assistantMessageEvent: { type: "text_delta", delta: "hello" },
    });
    expect(result).toEqual({ action: "append_text", text: "hello" });
  });

  it("handles text_delta with empty delta", () => {
    const result = parseAgentEvent({
      type: "message_update",
      assistantMessageEvent: { type: "text_delta" },
    });
    expect(result).toEqual({ action: "append_text", text: "" });
  });

  // message_update with text_end
  it("returns null for text_end", () => {
    const result = parseAgentEvent({
      type: "message_update",
      assistantMessageEvent: { type: "text_end" },
    });
    expect(result).toBeNull();
  });

  // thinking events
  it("handles thinking_start event", () => {
    const result = parseAgentEvent({
      type: "message_update",
      assistantMessageEvent: { type: "thinking_start" },
    });
    expect(result).toEqual({
      action: "add_block",
      block: { type: "thinking", text: "" },
    });
  });

  it("handles thinking_delta event", () => {
    const result = parseAgentEvent({
      type: "message_update",
      assistantMessageEvent: { type: "thinking_delta", delta: "reasoning..." },
    });
    expect(result).toEqual({
      action: "update_last_block",
      block: { type: "thinking", text: "reasoning..." },
    });
  });

  it("returns null for thinking_end", () => {
    const result = parseAgentEvent({
      type: "message_update",
      assistantMessageEvent: { type: "thinking_end" },
    });
    expect(result).toBeNull();
  });

  // toolcall events
  it("returns null for toolcall_start", () => {
    const result = parseAgentEvent({
      type: "message_update",
      assistantMessageEvent: { type: "toolcall_start" },
    });
    expect(result).toBeNull();
  });

  it("returns null for toolcall_end", () => {
    const result = parseAgentEvent({
      type: "message_update",
      assistantMessageEvent: { type: "toolcall_end" },
    });
    expect(result).toBeNull();
  });

  // done / error in message_update
  it("returns end_message for done", () => {
    const result = parseAgentEvent({
      type: "message_update",
      assistantMessageEvent: { type: "done" },
    });
    expect(result).toEqual({ action: "end_message" });
  });

  it("returns end_message for error", () => {
    const result = parseAgentEvent({
      type: "message_update",
      assistantMessageEvent: { type: "error" },
    });
    expect(result).toEqual({ action: "end_message" });
  });

  // message_update with missing assistantMessageEvent
  it("returns null if assistantMessageEvent is missing", () => {
    const result = parseAgentEvent({ type: "message_update" });
    expect(result).toBeNull();
  });

  // message_update with unknown sub-type
  it("returns null for unknown assistantMessageEvent type", () => {
    const result = parseAgentEvent({
      type: "message_update",
      assistantMessageEvent: { type: "unknown_sub_type" },
    });
    expect(result).toBeNull();
  });

  // tool_execution_start
  it("handles tool_execution_start", () => {
    const result = parseAgentEvent({
      type: "tool_execution_start",
      toolCallId: "tc1",
      toolName: "bash",
      args: { command: "ls" },
    });
    expect(result).toEqual({
      action: "add_block",
      block: {
        type: "tool",
        toolCallId: "tc1",
        toolName: "bash",
        toolArgs: { command: "ls" },
        toolStatus: "running",
        text: "执行命令",
      },
    });
  });

  it("skips ask_user tool_execution_start", () => {
    const result = parseAgentEvent({
      type: "tool_execution_start",
      toolCallId: "tc2",
      toolName: "ask_user",
    });
    expect(result).toBeNull();
  });

  it("maps tool names to Chinese labels", () => {
    const toolTests: Array<{ name: string; label: string }> = [
      { name: "bash", label: "执行命令" },
      { name: "read", label: "读取文件" },
      { name: "write", label: "写入文件" },
      { name: "edit", label: "编辑文件" },
      { name: "glob", label: "搜索文件" },
      { name: "grep", label: "搜索内容" },
      { name: "web_search", label: "网络搜索" },
      { name: "websearch", label: "网络搜索" },
      { name: "web_fetch", label: "获取网页" },
      { name: "webfetch", label: "获取网页" },
      { name: "task", label: "子任务" },
    ];

    for (const { name, label } of toolTests) {
      const result = parseAgentEvent({
        type: "tool_execution_start",
        toolCallId: "tc",
        toolName: name,
        args: {},
      });
      expect(result?.block?.text).toBe(label);
    }
  });

  it("uses toolName as label for unknown tools", () => {
    const result = parseAgentEvent({
      type: "tool_execution_start",
      toolCallId: "tc",
      toolName: "custom_tool",
      args: {},
    });
    expect(result?.block?.text).toBe("custom_tool");
  });

  // tool_execution_update
  it("returns null for tool_execution_update", () => {
    const result = parseAgentEvent({
      type: "tool_execution_update",
      toolCallId: "tc1",
    });
    expect(result).toBeNull();
  });

  // tool_execution_end
  it("handles tool_execution_end for non-write tools", () => {
    const result = parseAgentEvent({
      type: "tool_execution_end",
      toolCallId: "tc1",
      toolName: "bash",
      result: "output",
      isError: false,
    });
    expect(result).toEqual({
      action: "complete_tool",
      toolCallId: "tc1",
      isError: false,
      result: "output",
      fileBlock: undefined,
    });
  });

  it("handles tool_execution_end for write tool with file block", () => {
    const result = parseAgentEvent({
      type: "tool_execution_end",
      toolCallId: "tc1",
      toolName: "write",
      args: { file_path: "/path/to/file.py" },
      result: "ok",
      isError: false,
    });
    expect(result?.action).toBe("complete_tool");
    expect(result?.fileBlock).toEqual({
      type: "file",
      filePath: "/path/to/file.py",
      text: "file.py",
    });
  });

  it("handles tool_execution_end for edit tool with file block", () => {
    const result = parseAgentEvent({
      type: "tool_execution_end",
      toolCallId: "tc2",
      toolName: "edit",
      args: { file_path: "/src/main.ts" },
      result: "ok",
      isError: false,
    });
    expect(result?.fileBlock).toEqual({
      type: "file",
      filePath: "/src/main.ts",
      text: "main.ts",
    });
  });

  it("handles tool_execution_end with isError=true", () => {
    const result = parseAgentEvent({
      type: "tool_execution_end",
      toolCallId: "tc1",
      toolName: "bash",
      result: "command failed",
      isError: true,
    });
    expect(result?.isError).toBe(true);
  });

  it("skips ask_user tool_execution_end", () => {
    const result = parseAgentEvent({
      type: "tool_execution_end",
      toolCallId: "tc3",
      toolName: "ask_user",
    });
    expect(result).toBeNull();
  });

  // Ignored lifecycle events
  it("returns null for lifecycle events", () => {
    const ignored = [
      "message_start",
      "message_end",
      "turn_end",
      "auto_compaction_start",
      "auto_compaction_end",
      "auto_retry_start",
      "auto_retry_end",
    ];
    for (const type of ignored) {
      expect(parseAgentEvent({ type })).toBeNull();
    }
  });

  // Unknown event type
  it("returns null for unknown event types", () => {
    const result = parseAgentEvent({ type: "completely_unknown" });
    expect(result).toBeNull();
  });
});

describe("extractCodeBlocks", () => {
  it("returns empty array for text without code blocks", () => {
    expect(extractCodeBlocks("Hello world")).toEqual([]);
  });

  it("extracts a single code block with multiple lines", () => {
    const text = "Some text\n```python\nprint('hello')\nprint('world')\n```\nMore text";
    const result = extractCodeBlocks(text);
    expect(result).toHaveLength(1);
    expect(result[0].language).toBe("python");
    expect(result[0].code).toContain("print('world')");
  });

  it("extracts multiple code blocks", () => {
    const text = "```js\nconsole.log('a')\n```\n\n```py\nprint('b')\n```";
    const result = extractCodeBlocks(text);
    expect(result).toHaveLength(2);
    expect(result[0].language).toBe("js");
    expect(result[1].language).toBe("py");
  });

  it("extracts code block with filename", () => {
    const text = "```python main.py\nimport os\n```";
    const result = extractCodeBlocks(text);
    expect(result).toEqual([
      { language: "python", filename: "main.py", code: "import os" },
    ]);
  });

  it("defaults language to 'text' when not specified", () => {
    const text = "```\nline one\nline two\n```";
    const result = extractCodeBlocks(text);
    expect(result).toHaveLength(1);
    expect(result[0].language).toBe("text");
    expect(result[0].code).toContain("line two");
  });
});

describe("extractCitations", () => {
  it("returns empty array (stub implementation)", () => {
    expect(extractCitations("Some text with [1] citation")).toEqual([]);
  });
});
