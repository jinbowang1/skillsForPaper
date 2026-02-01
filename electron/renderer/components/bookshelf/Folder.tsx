import React, { useCallback } from "react";
import type { BookshelfItem } from "../../../preload/api";

interface Props {
  label: string;
  items: BookshelfItem[];
  color?: string;
}

export default function Folder({ label, items, color = "#4A6A5C" }: Props) {
  const handleClick = useCallback(() => {
    // Open the first item or reveal in Finder
    if (items.length > 0) {
      window.api.revealFile(items[0].path);
    }
  }, [items]);

  return (
    <div
      className="shelf-folder"
      style={{ "--fc": color } as React.CSSProperties}
      onClick={handleClick}
    >
      <div className="folder-back" />
      <div className="folder-tab" />
      <div className="folder-front">
        <span className="folder-label">{label}</span>
      </div>
      {items.length > 0 && (
        <div className="folder-count">{items.length}</div>
      )}
      <div className="book-tooltip">
        {items.map((it) => it.name).join(", ")}
        <small>{items.length} 个文件</small>
      </div>
    </div>
  );
}
