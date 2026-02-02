import React, { useCallback } from "react";
import {
  FileText,
  FileCode,
  FileJson,
  FileSpreadsheet,
  Image,
  BookOpen,
  File,
} from "lucide-react";
import type { BookshelfItem } from "../../../preload/api";
import { formatFileSize, formatRelativeTime, getDisplayName } from "../../utils/format";

interface Props {
  item: BookshelfItem;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  ".py": <FileCode size={14} />,
  ".json": <FileJson size={14} />,
  ".csv": <FileSpreadsheet size={14} />,
  ".png": <Image size={14} />,
  ".jpg": <Image size={14} />,
  ".svg": <Image size={14} />,
  ".pdf": <FileText size={14} />,
  ".tex": <FileText size={14} />,
  ".md": <FileText size={14} />,
  ".bib": <BookOpen size={14} />,
  ".docx": <FileText size={14} />,
};

const ICON_COLORS: Record<string, string> = {
  ".tex": "rgba(48, 209, 88, 0.12)",
  ".md":  "rgba(10, 132, 255, 0.12)",
  ".json": "rgba(255, 159, 10, 0.12)",
  ".csv": "rgba(64, 203, 224, 0.12)",
  ".png": "rgba(191, 90, 242, 0.12)",
  ".jpg": "rgba(191, 90, 242, 0.12)",
  ".svg": "rgba(191, 90, 242, 0.12)",
  ".pdf": "rgba(255, 69, 58, 0.12)",
  ".py":  "rgba(255, 214, 10, 0.12)",
  ".bib": "rgba(122, 106, 154, 0.12)",
  ".docx": "rgba(64, 203, 224, 0.12)",
};

function getTag(item: BookshelfItem): { label: string; cls: string } | null {
  // Active/focus has highest priority — this is the file the AI just wrote
  if (item.isActive) return { label: "关注", cls: "focus" };
  const age = Date.now() - item.mtime;
  if (age < 60000) return { label: "最新", cls: "latest" };
  if (item.category === "experiment" && (item.ext === ".json" || item.ext === ".csv"))
    return { label: "数据", cls: "data" };
  return null;
}

export default function DeskCard({ item }: Props) {
  const handleClick = useCallback(() => {
    window.api.openFile(item.path);
  }, [item.path]);

  const icon = ICON_MAP[item.ext] || <File size={14} />;
  const bgColor = ICON_COLORS[item.ext] || "rgba(142, 142, 147, 0.12)";
  const tag = getTag(item);
  const displayName = getDisplayName(item.name);

  const meta = [
    item.size > 0 ? formatFileSize(item.size) : null,
    formatRelativeTime(item.mtime),
  ].filter(Boolean).join(" · ");

  return (
    <div className={`desk-card${item.isActive ? " active" : ""}`} onClick={handleClick}>
      <div className="desk-card-icon" style={{ background: bgColor }}>
        {icon}
      </div>
      <div className="desk-card-info">
        <div className="desk-card-title">
          {displayName}
          {tag && <span className={`desk-card-tag ${tag.cls}`}>{tag.label}</span>}
        </div>
        <div className="desk-card-meta">{meta}</div>
      </div>
    </div>
  );
}
