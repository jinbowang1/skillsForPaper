import React, { useCallback, useMemo } from "react";
import type { BookshelfItem } from "../../../preload/api";
import { formatFileSize, formatRelativeTime } from "../../utils/format";

interface Props {
  item: BookshelfItem;
}

// Color palette for different file types (modern cool tones)
const EXT_COLORS: Record<string, string> = {
  ".tex": "#6E8AFA",  // 钴蓝
  ".md": "#5BA0D0",   // 天蓝
  ".pdf": "#E06070",  // 珊瑚粉
  ".docx": "#50B8A0", // 薄荷绿
  ".bib": "#A07AE0",  // 淡紫
  ".py": "#E0C050",   // 明金
  ".json": "#70B080", // 翠绿
  ".csv": "#60C0C0",  // 蓝绿
};

// Book dimensions based on file size (slim books to fit more on shelf)
function getBookDimensions(size: number): { w: number; h: number } {
  if (size > 50000) return { w: 20, h: 145 };
  if (size > 20000) return { w: 17, h: 130 };
  if (size > 5000) return { w: 15, h: 120 };
  if (size > 1000) return { w: 13, h: 110 };
  return { w: 11, h: 95 };
}

function getDisplayName(name: string): string {
  // Remove extension and common prefixes
  const base = name.replace(/\.[^.]+$/, "");
  // Map common file names to Chinese labels
  const nameMap: Record<string, string> = {
    OPENING_REPORT: "开题报告",
    Paper_Outline: "大纲",
    OAE_Paper: "论文",
    oae_paper: "论文",
    RESEARCH_PLAN: "研究计划",
    Experiment_Design: "实验设计",
    Literature_Review: "文献综述",
    oae_experiment: "实验脚本",
    plot_results: "绘图",
    references: "引用",
  };
  return nameMap[base] || base;
}

export default function Book({ item }: Props) {
  const { w, h } = useMemo(() => getBookDimensions(item.size), [item.size]);
  const color = EXT_COLORS[item.ext] || "#5B8AB5";
  const isThin = w <= 15;
  const ext = item.ext;

  const handleClick = useCallback(() => {
    window.api.openFile(item.path);
  }, [item.path]);

  return (
    <div
      className={`book ${isThin ? "thin" : ""} ${item.isActive ? "active" : ""}`}
      style={{
        "--c": color,
        "--w": `${w}px`,
        "--h": `${h}px`,
      } as React.CSSProperties}
      onClick={handleClick}
    >
      <span className="book-title">{getDisplayName(item.name)}</span>
      <span className="book-ext">{ext}</span>
      <div className="book-tooltip">
        {item.name}
        <small>
          {formatFileSize(item.size)} · {formatRelativeTime(item.mtime)}
        </small>
      </div>
    </div>
  );
}
