import type { ContentBlock } from "../stores/session-store";

export interface ParsedEvent {
  action:
    | "new_assistant_message"
    | "append_text"
    | "add_block"
    | "update_last_block"
    | "end_message"
    | "complete_tool"
    | "ignore";
  text?: string;
  block?: ContentBlock;
  // For complete_tool
  toolCallId?: string;
  isError?: boolean;
  result?: string;
  fileBlock?: ContentBlock;
}

/**
 * Parse an AgentSession event into an action for the session store.
 *
 * pi-coding-agent events:
 * - { type: "agent_start" }
 * - { type: "message_start", message }
 * - { type: "message_update", message, assistantMessageEvent }
 *     assistantMessageEvent.type: "text_start" | "text_delta" | "text_end"
 *                                 | "thinking_start" | "thinking_delta" | "thinking_end"
 *                                 | "toolcall_start" | "toolcall_end"
 *                                 | "start" | "done" | "error"
 * - { type: "message_end", message }
 * - { type: "tool_execution_start", toolCallId, toolName, args }
 * - { type: "tool_execution_update", toolCallId, toolName, ... }
 * - { type: "tool_execution_end", toolCallId, toolName, result, isError }
 * - { type: "turn_start" } / { type: "turn_end" }
 * - { type: "agent_end", messages }
 */
export function parseAgentEvent(event: any): ParsedEvent | null {
  if (!event || !event.type) return null;

  switch (event.type) {
    case "agent_start":
      return { action: "new_assistant_message" };

    case "message_update": {
      const ame = event.assistantMessageEvent;
      if (!ame) return null;

      switch (ame.type) {
        case "text_start":
          return {
            action: "add_block",
            block: { type: "text", text: "" },
          };

        case "text_delta":
          return { action: "append_text", text: ame.delta || "" };

        case "text_end":
          return null;

        case "thinking_start":
          return {
            action: "add_block",
            block: { type: "thinking", text: "" },
          };

        case "thinking_delta":
          return {
            action: "update_last_block",
            block: { type: "thinking", text: ame.delta || "" },
          };

        case "thinking_end":
          return null;

        case "toolcall_start":
          return null;

        // toolcall_end: the LLM decided to call a tool.
        // We don't create cards here — tool_execution_start/end handle display.
        case "toolcall_end":
          return null;

        // "done" fires per-turn. Close the current turn's message so that
        // auto-continue turns appear as separate message bubbles
        // (matching Claude Code / pi-coding TUI behavior).
        case "done":
          return { action: "end_message" };

        case "error":
          // Errors might not be followed by agent_end, so end here as fallback
          return { action: "end_message" };

        default:
          return null;
      }
    }

    case "tool_execution_start": {
      const toolName = event.toolName || "";
      // Skip ask_user — it's handled by DecisionCard via decision:request IPC
      if (toolName === "ask_user") return null;
      const toolArgs = event.args || {};
      return {
        action: "add_block",
        block: {
          type: "tool",
          toolCallId: event.toolCallId,
          toolName,
          toolArgs,
          toolStatus: "running",
          text: getToolLabel(toolName),
        },
      };
    }

    case "tool_execution_update":
      // Streaming tool output — currently ignored
      return null;

    case "tool_execution_end": {
      const toolName = event.toolName || "";
      if (toolName === "ask_user") return null;
      const toolArgs = event.args || {};

      // For write/edit tools, also create a file card
      let fileBlock: ContentBlock | undefined;
      if (isFileWriteTool(toolName)) {
        const filePath = toolArgs.file_path || toolArgs.path || "";
        if (filePath) {
          fileBlock = {
            type: "file",
            filePath,
            text: extractFilename(filePath),
          };
        }
      }

      return {
        action: "complete_tool",
        toolCallId: event.toolCallId,
        isError: !!event.isError,
        result: typeof event.result === "string"
          ? event.result
          : JSON.stringify(event.result)?.slice(0, 200),
        fileBlock,
      };
    }

    case "agent_end":
      return { action: "end_message" };

    // turn_start: create a new assistant message for each turn, so
    // auto-continue turns get separate bubbles. The handler in
    // useAgentEvents already skips if a streaming message exists,
    // so the first turn_start (after agent_start) is a safe no-op.
    case "turn_start":
      return { action: "new_assistant_message" };

    // Ignore these lifecycle events
    case "message_start":
    case "message_end":
    case "turn_end":
    case "auto_compaction_start":
    case "auto_compaction_end":
    case "auto_retry_start":
    case "auto_retry_end":
      return null;

    default:
      // Log unknown events for debugging
      console.log("[message-parser] unknown event type:", event.type, event);
      return null;
  }
}

function isFileWriteTool(name: string): boolean {
  const n = name.toLowerCase();
  return n === "write" || n === "edit";
}

function getToolLabel(toolName: string): string {
  const n = toolName.toLowerCase();
  switch (n) {
    case "bash": return "执行命令";
    case "read": return "读取文件";
    case "write": return "写入文件";
    case "edit": return "编辑文件";
    case "glob": return "搜索文件";
    case "grep": return "搜索内容";
    case "web_search":
    case "websearch": return "网络搜索";
    case "web_fetch":
    case "webfetch": return "获取网页";
    case "task": return "子任务";
    default: return toolName;
  }
}

function extractFilename(filePath: string): string {
  return filePath.split("/").pop() || filePath;
}

/**
 * Extract code blocks from markdown text.
 */
export function extractCodeBlocks(
  text: string
): Array<{ language: string; code: string; filename?: string }> {
  const codeBlockRegex = /```(\w+)?(?:\s+(.+?))?\n([\s\S]*?)```/g;
  const blocks: Array<{ language: string; code: string; filename?: string }> =
    [];
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    blocks.push({
      language: match[1] || "text",
      filename: match[2]?.trim(),
      code: match[3].trimEnd(),
    });
  }

  return blocks;
}

/**
 * Check if text contains citation patterns.
 */
export function extractCitations(
  text: string
): Array<{ source: string; title: string; authors: string; year?: string }> {
  return [];
}
