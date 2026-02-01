import React, { useCallback } from "react";
import type { BookshelfItem } from "../../../preload/api";
import { formatFileSize, formatRelativeTime } from "../../utils/format";

interface Props {
  item: BookshelfItem;
}

export default function PinnedChart({ item }: Props) {
  const handleClick = useCallback(() => {
    window.api.openFile(item.path);
  }, [item.path]);

  return (
    <div className="pinned-chart" onClick={handleClick}>
      {/* Simple chart placeholder - could be replaced with actual thumbnail */}
      <svg viewBox="0 0 64 48" fill="none">
        <polyline
          points="4,42 12,40 20,36 28,28 36,20 44,13 52,8 60,5"
          stroke="#30D158"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
        <polyline
          points="4,40 12,39 20,38 28,36 36,34 44,32 52,30 60,28"
          stroke="#636366"
          strokeWidth="1"
          fill="none"
          strokeDasharray="2 2"
        />
      </svg>
      <div className="book-tooltip">
        {item.name}
        <small>
          {formatFileSize(item.size)} · {formatRelativeTime(item.mtime)}
        </small>
      </div>
    </div>
  );
}
