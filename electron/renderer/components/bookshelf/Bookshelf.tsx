import React, { useMemo } from "react";
import { useBookshelfStore } from "../../stores/bookshelf-store";
import DeskCard from "./DeskCard";
import FolderCard from "./FolderCard";
import UserPanel from "./UserPanel";
import type { BookshelfItem } from "../../../preload/api";

/** Per-category: which extensions count as "finished product" (shown as cards) */
const PAPER_PRODUCTS = new Set([".pdf", ".docx"]);
const EXPERIMENT_PRODUCTS = new Set([".png", ".jpg", ".svg"]);
const RESEARCH_PRODUCTS = new Set([".pdf"]);

interface CategoryGroup {
  products: BookshelfItem[];
  process: BookshelfItem[];
}

export default function Bookshelf() {
  const items = useBookshelfStore((s) => s.items);

  const groups = useMemo(() => {
    const paper: CategoryGroup = { products: [], process: [] };
    const experiment: CategoryGroup = { products: [], process: [] };
    const research: CategoryGroup = { products: [], process: [] };

    for (const item of items) {
      const cat = item.category;

      if (cat === "experiment") {
        if (EXPERIMENT_PRODUCTS.has(item.ext)) {
          experiment.products.push(item);
        } else {
          experiment.process.push(item);
        }
      } else if (cat === "research") {
        if (RESEARCH_PRODUCTS.has(item.ext)) {
          research.products.push(item);
        } else {
          research.process.push(item);
        }
      } else {
        // paper / draft / other → 论文
        if (PAPER_PRODUCTS.has(item.ext)) {
          paper.products.push(item);
        } else {
          paper.process.push(item);
        }
      }
    }

    return { paper, experiment, research };
  }, [items]);

  const hasAnything = items.length > 0;

  return (
    <aside className="desk">
      <div className="desk-titlebar">
        <span className="desk-title">书桌</span>
      </div>

      <div className="desk-content">
        <DeskSection label="论文" group={groups.paper} folderLabel="草稿 & 源文件" />
        <DeskSection label="实验" group={groups.experiment} folderLabel="脚本 & 数据" />
        <DeskSection label="调研" group={groups.research} folderLabel="笔记 & 资料" />

        {!hasAnything && (
          <div className="desk-empty">
            output/ 目录中的文件<br />会出现在这里
          </div>
        )}
      </div>

      <UserPanel />
    </aside>
  );
}

function DeskSection({
  label,
  group,
  folderLabel,
}: {
  label: string;
  group: CategoryGroup;
  folderLabel: string;
}) {
  if (group.products.length === 0 && group.process.length === 0) return null;

  return (
    <div className="desk-category-group">
      <div className="desk-category">{label}</div>
      {group.products.length > 0 && (
        <div className="desk-stack">
          {group.products.map((item) => (
            <DeskCard key={item.path} item={item} />
          ))}
        </div>
      )}
      {group.process.length > 0 && (
        <FolderCard label={folderLabel} items={group.process} />
      )}
    </div>
  );
}
