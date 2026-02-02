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
  ".py": <FileCode size={18} />,
  ".json": <FileJson size={18} />,
  ".csv": <FileSpreadsheet size={18} />,
  ".png": <Image size={18} />,
  ".jpg": <Image size={18} />,
  ".svg": <Image size={18} />,
  ".pdf": <FileText size={18} />,
  ".tex": <FileText size={18} />,
  ".md": <FileText size={18} />,
  ".bib": <BookOpen size={18} />,
  ".docx": <FileText size={18} />,
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
  const age = Date.now() - item.mtime;
  if (age < 60000) return { label: "最新", cls: "latest" };
  if (item.isActive) return { label: "撰写中", cls: "editing" };
  if (item.category === "experiment" && (item.ext === ".json" || item.ext === ".csv"))
    return { label: "数据", cls: "data" };
  return null;
}

export default function DeskCard({ item }: Props) {
  const handleClick = useCallback(() => {
    window.api.openFile(item.path);
  }, [item.path]);

  const icon = ICON_MAP[item.ext] || <File size={18} />;
  const bgColor = ICON_COLORS[item.ext] || "rgba(142, 142, 147, 0.12)";
  const tag = getTag(item);
  const displayName = getDisplayName(item.name);

  return (
    <div className="desk-card" onClick={handleClick}>
      <div className="desk-card-top">
        <div className="desk-card-icon" style={{ background: bgColor }}>
          {icon}
        </div>
        <div className="desk-card-info">
          <div className="desk-card-title">{displayName}</div>
          <div className="desk-card-subtitle">
            {item.name} {item.size > 0 && `· ${formatFileSize(item.size)}`}
          </div>
        </div>
      </div>
      <div className="desk-card-footer">
        <span>{formatRelativeTime(item.mtime)}</span>
        {tag && <span className={`desk-card-tag ${tag.cls}`}>{tag.label}</span>}
      </div>
    </div>
  );
}
