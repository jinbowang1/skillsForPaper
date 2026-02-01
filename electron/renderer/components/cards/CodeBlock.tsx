import React, { useState, useEffect, useRef } from "react";
import { Copy, Check } from "lucide-react";

interface Props {
  code: string;
  language: string;
  filename?: string;
}

export default function CodeBlock({ code, language, filename }: Props) {
  const [copied, setCopied] = useState(false);
  const [highlighted, setHighlighted] = useState<string>("");
  const codeRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    // Attempt to use Shiki for highlighting
    let cancelled = false;

    async function highlight() {
      try {
        const { codeToHtml } = await import("shiki");
        const html = await codeToHtml(code, {
          lang: language || "text",
          theme: "github-dark",
        });
        if (!cancelled) {
          setHighlighted(html);
        }
      } catch {
        // Fallback: plain text
        if (!cancelled) {
          setHighlighted("");
        }
      }
    }

    highlight();
    return () => { cancelled = true; };
  }, [code, language]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const ext = language || filename?.split(".").pop() || "";
  const displayName = filename || `snippet.${ext}`;

  // Count lines for line numbers
  const lines = code.split("\n");

  return (
    <div className="code-card">
      <div className="code-header">
        <div className="code-filename">
          <span className={`dot ${ext}`} />
          {displayName}
        </div>
        <button className="code-copy" onClick={handleCopy}>
          {copied ? (
            <>
              <Check size={12} style={{ marginRight: 4 }} />
              已复制
            </>
          ) : (
            <>
              <Copy size={12} style={{ marginRight: 4 }} />
              复制
            </>
          )}
        </button>
      </div>
      <div className="code-body">
        {highlighted ? (
          <div dangerouslySetInnerHTML={{ __html: highlighted }} />
        ) : (
          <div className="code-lines">
            <div className="code-line-nums">
              {lines.map((_, i) => (
                <React.Fragment key={i}>
                  {i + 1}
                  <br />
                </React.Fragment>
              ))}
            </div>
            <pre ref={codeRef}>
              <code>{code}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
