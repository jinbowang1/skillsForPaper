import React, { useCallback, useState } from "react";
import {
  Folder,
  ChevronRight,
  FileText,
  FileCode,
  FileJson,
  FileSpreadsheet,
  Image,
  BookOpen,
  File,
} from "lucide-react";
import type { BookshelfItem } from "../../../preload/api";
import { formatFileSize, getDisplayName } from "../../utils/format";

interface Props {
  label: string;
  items: BookshelfItem[];
}

const ICON_MAP: Record<string, React.ReactNode> = {
  ".py": <FileCode size={13} />,
  ".json": <FileJson size={13} />,
  ".csv": <FileSpreadsheet size={13} />,
  ".png": <Image size={13} />,
  ".jpg": <Image size={13} />,
  ".svg": <Image size={13} />,
  ".tex": <FileText size={13} />,
  ".md": <FileText size={13} />,
  ".bib": <BookOpen size={13} />,
};

export default function FolderCard({ label, items }: Props) {
  const [open, setOpen] = useState(false);

  const handleToggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const handleFileClick = useCallback((e: React.MouseEvent, filePath: string) => {
    e.stopPropagation();
    window.api.openFile(filePath);
  }, []);

  return (
    <div className={`desk-folder ${open ? "open" : ""}`}>
      <div className="desk-folder-header" onClick={handleToggle}>
        <div className="desk-folder-icon">
          <Folder size={15} />
        </div>
        <div className="desk-folder-info">
          <div className="desk-folder-title">{label}</div>
          <div className="desk-folder-count">{items.length} 个文件</div>
        </div>
        <ChevronRight size={14} className="desk-folder-chevron" />
      </div>
      <div className="desk-folder-files">
        <div className="desk-folder-files-inner">
          {items.map((item) => (
            <div
              key={item.path}
              className="desk-folder-file"
              onClick={(e) => handleFileClick(e, item.path)}
            >
              <span className="desk-folder-file-icon">
                {ICON_MAP[item.ext] || <File size={13} />}
              </span>
              <span className="desk-folder-file-name">
                {getDisplayName(item.name)}
              </span>
              {item.size > 0 && (
                <span className="desk-folder-file-size">
                  {formatFileSize(item.size)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
