import React, { useMemo } from "react";
import { useBookshelfStore } from "../../stores/bookshelf-store";
import Shelf from "./Shelf";
import UserPanel from "./UserPanel";
import type { BookshelfItem } from "../../../preload/api";

export default function Bookshelf() {
  const items = useBookshelfStore((s) => s.items);

  // Group items by category
  const grouped = useMemo(() => {
    const groups: Record<string, BookshelfItem[]> = {
      paper: [],
      experiment: [],
      research: [],
    };

    for (const item of items) {
      const cat = item.category;
      if (cat === "draft") {
        // Draft items go into paper group (Shelf aggregates them into a folder)
        groups.paper.push(item);
      } else if (cat in groups) {
        groups[cat].push(item);
      } else {
        groups.paper.push(item);
      }
    }

    return groups;
  }, [items]);

  return (
    <aside className="bookshelf">
      <div className="shelf-titlebar">
        <span className="shelf-title">书架</span>
      </div>

      <div className="shelves">
        {grouped.paper.length > 0 && (
          <Shelf label="论文" items={grouped.paper} />
        )}
        {grouped.experiment.length > 0 && (
          <Shelf label="实验" items={grouped.experiment} />
        )}
        {grouped.research.length > 0 && (
          <Shelf label="调研" items={grouped.research} />
        )}
        {items.length === 0 && (
          <div style={{
            padding: "40px 20px",
            textAlign: "center",
            color: "rgba(200, 180, 160, 0.3)",
            fontSize: 12,
          }}>
            output/ 目录中的文件<br />会出现在这里
          </div>
        )}
      </div>

      <UserPanel />
    </aside>
  );
}
