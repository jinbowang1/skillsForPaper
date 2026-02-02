import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage, ContentBlock } from "../../stores/session-store";
import { useUserStore } from "../../stores/user-store";
import DashixiongAvatar from "../DashixiongAvatar";
import { formatTime } from "../../utils/format";
import ThinkBlock from "../cards/ThinkBlock";
import CodeBlock from "../cards/CodeBlock";
import FileCard from "../cards/FileCard";
import DecisionCard from "../cards/DecisionCard";
import StepIndicator from "../cards/StepIndicator";
import StatusCard from "../cards/StatusCard";
import CitationCard from "../cards/CitationCard";
import ToolCard from "../cards/ToolCard";

interface Props {
  message: ChatMessage;
}

function renderBlock(block: ContentBlock, index: number, isStreaming?: boolean) {
  switch (block.type) {
    case "text":
    case "thinking":
      return null; // Handled separately
    case "code":
      return (
        <CodeBlock
          key={`code-${index}`}
          code={block.code || ""}
          language={block.language || "text"}
          filename={block.filename}
        />
      );
    case "file":
      return (
        <FileCard
          key={`file-${index}`}
          name={block.text || ""}
          path={block.filePath || ""}
          size={block.fileSize}
        />
      );
    case "decision":
      return (
        <DecisionCard
          key={`dec-${index}`}
          toolCallId={block.toolCallId || ""}
          question={block.question || ""}
          options={block.options || []}
          answered={block.answered}
          selectedIndex={block.selectedIndex}
        />
      );
    case "steps":
      return (
        <StepIndicator
          key={`step-${index}`}
          title={block.taskTitle || ""}
          steps={block.steps || []}
        />
      );
    case "status":
      return <StatusCard key={`status-${index}`} metrics={block.metrics} />;
    case "citation":
      return <CitationCard key={`cite-${index}`} citations={block.citations || []} />;
    case "tool":
      return (
        <ToolCard
          key={`tool-${index}`}
          toolName={block.toolName}
          toolStatus={block.toolStatus}
          toolArgs={block.toolArgs}
          label={block.text}
          toolResult={block.toolResult}
          isError={block.isError}
        />
      );
    default:
      return null;
  }
}

function MessageBubbleInner({ message }: Props) {
  const { role, blocks, timestamp, isStreaming } = message;
  const isAI = role === "assistant";
  const { userName, userInitial, aiName } = useUserStore();

  // Gather all text blocks into one combined text
  const textContent = blocks
    .filter((b) => b.type === "text")
    .map((b) => b.text || "")
    .join("");

  // Combine all thinking blocks into one
  const thinkingBlocks = blocks.filter((b) => b.type === "thinking");
  const combinedThinkingText = thinkingBlocks
    .map((b) => b.text || "")
    .filter((t) => t.trim())
    .join("\n\n");

  // Tool blocks (rendered compactly)
  const toolBlocks = blocks.filter((b) => b.type === "tool");

  // Other special blocks (file, decision, code, etc.)
  const otherBlocks = blocks.filter(
    (b) => b.type !== "text" && b.type !== "thinking" && b.type !== "tool"
  );

  const hasThinking = thinkingBlocks.length > 0;
  const showThinking = combinedThinkingText || (isStreaming && hasThinking);

  // Show loading bubble when assistant is streaming but has no visible content yet
  const showLoadingBubble =
    isAI && isStreaming && !textContent && !showThinking && toolBlocks.length === 0;

  return (
    <div className="message-group">
      {/* Combined think block */}
      {showThinking && (
        <ThinkBlock text={combinedThinkingText} isStreaming={isStreaming} />
      )}

      {/* Loading bubble — assistant preparing response */}
      {showLoadingBubble && (
        <div className="msg from-ai">
          <div className="msg-avatar">
            <DashixiongAvatar size={28} />
          </div>
          <div className="msg-body">
            <div className="msg-name">{aiName}</div>
            <div className="bubble">
              <span className="streaming-dots">
                <span className="t-dot" />
                <span className="t-dot" />
                <span className="t-dot" />
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main message bubble */}
      {textContent && (
        <div className={`msg ${isAI ? "from-ai" : "from-user"}`}>
          <div className="msg-avatar">
            {isAI ? (
              <DashixiongAvatar size={28} />
            ) : (
              userInitial
            )}
          </div>
          <div className="msg-body">
            <div className="msg-name">{isAI ? aiName : userName}</div>
            <div className="bubble">
              {isAI ? (
                isStreaming ? (
                  <span style={{ whiteSpace: "pre-wrap" }}>{textContent}</span>
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || "");
                        const isInline = !match && !String(children).includes("\n");
                        if (isInline) {
                          return <code {...props}>{children}</code>;
                        }
                        return <code className={className} {...props}>{children}</code>;
                      },
                    }}
                  >
                    {textContent}
                  </ReactMarkdown>
                )
              ) : (
                textContent
              )}
            </div>
            <div className="msg-time">{formatTime(timestamp)}</div>
          </div>
        </div>
      )}

      {/* Tool cards — compact group */}
      {toolBlocks.length > 0 && (
        <div className="tool-group">
          {toolBlocks.map((block, i) => (
            <ToolCard
              key={`tool-${i}`}
              toolName={block.toolName}
              toolStatus={block.toolStatus}
              toolArgs={block.toolArgs}
              label={block.text}
              toolResult={block.toolResult}
              isError={block.isError}
            />
          ))}
        </div>
      )}

      {/* Other special blocks */}
      {otherBlocks.map((block, i) => renderBlock(block, i, isStreaming))}
    </div>
  );
}

const MessageBubble = React.memo(MessageBubbleInner);
export default MessageBubble;
