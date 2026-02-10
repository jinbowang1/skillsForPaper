import React, { useMemo, useState } from "react";
import { FolderOpen, ChevronDown, ChevronRight } from "lucide-react";
import { useBookshelfStore } from "../../stores/bookshelf-store";
import { useUIStore } from "../../stores/ui-store";
import DeskCard from "./DeskCard";
import UserPanel from "./UserPanel";
import ProfilePanel from "./ProfilePanel";
import GuidePanel from "./GuidePanel";
import FaqPanel from "./FaqPanel";
import AccountPanel from "../AccountPanel";
import SettingsPanel from "./SettingsPanel";
import type { BookshelfItem } from "../../../preload/api";

const MAX_RECENT = 5;
const MAX_VISIBLE = 5;

export default function Bookshelf() {
  const items = useBookshelfStore((s) => s.items);
  const activePanel = useUIStore((s) => s.activePanel);

  const { recent, paper, experiment, reference, draft } = useMemo(() => {
    // 按修改时间排序（最新的在前）
    const sorted = [...items].sort((a, b) => b.mtime - a.mtime);

    // 最近文件：取前 N 个
    const recent = sorted.slice(0, MAX_RECENT);

    // 分类
    const paper: BookshelfItem[] = [];
    const experiment: BookshelfItem[] = [];
    const reference: BookshelfItem[] = [];
    const draft: BookshelfItem[] = [];

    for (const item of sorted) {
      if (item.category === "reference") {
        reference.push(item);
      } else if (item.category === "experiment") {
        experiment.push(item);
      } else if (item.category === "draft") {
        draft.push(item);
      } else {
        paper.push(item);
      }
    }

    return { recent, paper, experiment, reference, draft };
  }, [items]);

  const hasAnything = items.length > 0;

  const handleOpenFolder = () => {
    window.api.revealOutputDir();
  };

  return (
    <aside className="desk">
      <div className="desk-titlebar">
        <span className="desk-title">书桌</span>
        {hasAnything && (
          <button
            className="desk-folder-btn"
            onClick={handleOpenFolder}
            title="打开文件夹"
          >
            <FolderOpen size={14} />
          </button>
        )}
      </div>

      <div className="desk-content">
        {hasAnything ? (
          <>
            <DeskSection
              label="最近"
              items={recent}
              defaultExpanded
              maxVisible={MAX_RECENT}
            />
            <DeskSection
              label="论文"
              items={paper}
              defaultExpanded
              maxVisible={MAX_VISIBLE}
            />
            <DeskSection
              label="实验"
              items={experiment}
              defaultExpanded={experiment.length <= MAX_VISIBLE}
              maxVisible={MAX_VISIBLE}
            />
            <DeskSection
              label="资料"
              items={reference}
              defaultExpanded={reference.length <= MAX_VISIBLE}
              maxVisible={MAX_VISIBLE}
            />
            <DeskSection
              label="草稿"
              items={draft}
              defaultExpanded={false}
              maxVisible={MAX_VISIBLE}
              alwaysShow
              emptyText="未分类的文件会出现在这里"
            />
          </>
        ) : (
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
      {activePanel === "account" && (
        <div className="sidebar-panel">
          <AccountPanel onClose={() => useUIStore.getState().closePanel()} />
        </div>
      )}
      {activePanel === "settings" && <SettingsPanel />}
    </aside>
  );
}

function DeskSection({
  label,
  items,
  defaultExpanded = true,
  maxVisible = 5,
  alwaysShow = false,
  emptyText,
}: {
  label: string;
  items: BookshelfItem[];
  defaultExpanded?: boolean;
  maxVisible?: number;
  alwaysShow?: boolean;
  emptyText?: string;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [showAll, setShowAll] = useState(false);

  if (items.length === 0 && !alwaysShow) return null;

  const visibleItems = showAll ? items : items.slice(0, maxVisible);
  const hasMore = items.length > maxVisible;

  return (
    <div className="desk-category-group">
      <button
        className="desk-category-header"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="desk-category-label">{label}</span>
        <span className="desk-category-count">{items.length}</span>
        <span className="desk-category-chevron">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>

      {expanded && (
        <div className="desk-stack">
          {items.length === 0 ? (
            <div className="desk-empty-hint">{emptyText || "暂无文件"}</div>
          ) : (
            <>
              {visibleItems.map((item) => (
                <DeskCard key={item.path} item={item} />
              ))}
              {hasMore && !showAll && (
                <button
                  className="desk-show-more"
                  onClick={() => setShowAll(true)}
                >
                  +{items.length - maxVisible} 个文件
                </button>
              )}
              {hasMore && showAll && (
                <button
                  className="desk-show-more"
                  onClick={() => setShowAll(false)}
                >
                  收起
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
