import React, { useState, useEffect, useRef } from "react";
import {
  Terminal,
  FileText,
  FilePlus,
  Pencil,
  FolderSearch,
  Search,
  Globe,
  Wrench,
  Check,
  X,
  ListTree,
  ChevronDown,
} from "lucide-react";

interface Props {
  toolName?: string;
  toolStatus?: "running" | "done" | "error";
  toolArgs?: Record<string, any>;
  label?: string;
  toolResult?: string;
  isError?: boolean;
}

function getToolIcon(name: string) {
  const n = name.toLowerCase();
  switch (n) {
    case "bash": return <Terminal size={16} />;
    case "read": return <FileText size={16} />;
    case "write": return <FilePlus size={16} />;
    case "edit": return <Pencil size={16} />;
    case "glob": return <FolderSearch size={16} />;
    case "grep": return <Search size={16} />;
    case "web_search":
    case "websearch": return <Globe size={16} />;
    case "web_fetch":
    case "webfetch": return <Globe size={16} />;
    case "task": return <ListTree size={16} />;
    default: return <Wrench size={16} />;
  }
}

function getToolSummary(name: string, args: Record<string, any>): string {
  const n = name.toLowerCase();
  switch (n) {
    case "bash":
      return truncate(args.command || "", 120);
    case "read":
      return extractShortPath(args.file_path || args.path || "");
    case "write":
      return extractShortPath(args.file_path || args.path || "");
    case "edit":
      return extractShortPath(args.file_path || args.path || "");
    case "glob":
      return args.pattern || "";
    case "grep":
      return args.pattern || "";
    case "web_search":
    case "websearch":
      return args.query || "";
    case "web_fetch":
    case "webfetch":
      return truncate(args.url || "", 80);
    case "task":
      return truncate(args.description || args.prompt || "", 80);
    default:
      return "";
  }
}

function getFullDetail(name: string, args: Record<string, any>): string {
  const n = name.toLowerCase();
  switch (n) {
    case "bash":
      return args.command || "";
    case "read":
      return args.file_path || args.path || "";
    case "write":
      return args.file_path || args.path || "";
    case "edit": {
      const parts: string[] = [];
      if (args.file_path || args.path) parts.push(args.file_path || args.path);
      if (args.old_string) parts.push(`- ${args.old_string}`);
      if (args.new_string) parts.push(`+ ${args.new_string}`);
      return parts.join("\n");
    }
    case "glob":
      return args.pattern || "";
    case "grep":
      return `pattern: ${args.pattern || ""}\npath: ${args.path || "."}`;
    case "web_search":
    case "websearch":
      return args.query || "";
    case "web_fetch":
    case "webfetch":
      return args.url || "";
    case "task":
      return args.description || args.prompt || "";
    default:
      return JSON.stringify(args, null, 2);
  }
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + "...";
}

function extractShortPath(filePath: string): string {
  const parts = filePath.split("/");
  if (parts.length <= 3) return filePath;
  return ".../" + parts.slice(-2).join("/");
}

export default function ToolCard({
  toolName = "",
  toolStatus = "running",
  toolArgs = {},
  label,
  toolResult,
  isError,
}: Props) {
  const summary = getToolSummary(toolName, toolArgs);
  const fullDetail = getFullDetail(toolName, toolArgs);
  const clippedResult = toolResult ? truncate(toolResult, 500) : "";

  const [expanded, setExpanded] = useState(toolStatus === "running");
  const prevStatus = useRef(toolStatus);

  useEffect(() => {
    // Auto-expand when running starts
    if (toolStatus === "running" && prevStatus.current !== "running") {
      setExpanded(true);
    }
    // Auto-collapse when done/error
    if (
      (toolStatus === "done" || toolStatus === "error") &&
      prevStatus.current === "running"
    ) {
      setExpanded(false);
    }
    prevStatus.current = toolStatus;
  }, [toolStatus]);

  const toggleExpanded = () => setExpanded((v) => !v);

  return (
    <div className={`tool-card ${toolStatus}${expanded ? " expanded" : ""}`}>
      <div className="tool-card-header" onClick={toggleExpanded}>
        <div className="tool-card-icon">
          {getToolIcon(toolName)}
        </div>
        <span className="tool-card-label">{label || toolName}</span>
        {summary && <span className="tool-card-summary">{summary}</span>}
        <div className="tool-card-status">
          {toolStatus === "running" && (
            <span className="spinner" style={{ width: 12, height: 12, borderWidth: "1.5px" }} />
          )}
          {toolStatus === "done" && (
            <Check size={14} className="tool-card-done" />
          )}
          {toolStatus === "error" && (
            <X size={14} className="tool-card-error" />
          )}
        </div>
        <ChevronDown size={12} className="tool-card-chevron" />
      </div>
      <div className="tool-card-detail">
        <div className="tool-card-detail-inner">
          {fullDetail && (
            <pre className="tool-card-full">{fullDetail}</pre>
          )}
          {clippedResult && (
            <div className={`tool-card-result${isError ? " is-error" : ""}`}>
              <pre>{clippedResult}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
