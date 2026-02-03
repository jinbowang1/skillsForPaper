import React, { useMemo } from "react";
import { useBookshelfStore } from "../../stores/bookshelf-store";
import { useUIStore } from "../../stores/ui-store";
import DeskCard from "./DeskCard";
import FolderCard from "./FolderCard";
import UserPanel from "./UserPanel";
import ProfilePanel from "./ProfilePanel";
import GuidePanel from "./GuidePanel";
import FaqPanel from "./FaqPanel";
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
  const activePanel = useUIStore((s) => s.activePanel);

  const { activeItems, groups } = useMemo(() => {
    const active: BookshelfItem[] = [];
    const paper: CategoryGroup = { products: [], process: [] };
    const experiment: CategoryGroup = { products: [], process: [] };
    const research: CategoryGroup = { products: [], process: [] };

    for (const item of items) {
      // Extract active items — they'll be shown at the top separately
      if (item.isActive) {
        active.push(item);
        continue;
      }

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

    return { activeItems: active, groups: { paper, experiment, research } };
  }, [items]);

  const hasAnything = items.length > 0;

  return (
    <aside className="desk">
      <div className="desk-titlebar">
        <span className="desk-title">书桌</span>
      </div>

      <div className="desk-content">
        {activeItems.length > 0 && (
          <div className="desk-category-group">
            <div className="desk-category">当前关注</div>
            <div className="desk-stack">
              {activeItems.map((item) => (
                <DeskCard key={item.path} item={item} />
              ))}
            </div>
          </div>
        )}
        <DeskSection label="论文" group={groups.paper} folderLabel="草稿 & 源文件" />
        <DeskSection label="实验" group={groups.experiment} folderLabel="脚本 & 数据" />
        <DeskSection label="调研" group={groups.research} folderLabel="笔记 & 资料" />

        {!hasAnything && (
          <div className="desk-empty">
            <div className="desk-empty-icon">📁</div>
            <div className="desk-empty-title">书桌空空如也</div>
            <div className="desk-empty-desc">
              和大师兄对话时生成的文件<br />
              会自动出现在这里
            </div>
          </div>
        )}
      </div>

      <UserPanel />

      {activePanel === "profile" && <ProfilePanel />}
      {activePanel === "guide" && <GuidePanel />}
      {activePanel === "faq" && <FaqPanel />}
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
