import React, { useCallback } from "react";
import {
  FileText,
  FileCode,
  FileJson,
  FileSpreadsheet,
  Image,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import { formatFileSize } from "../../utils/format";

interface Props {
  name: string;
  path: string;
  size?: number;
  meta?: string;
}

function getIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const iconProps = { size: 20 };
  switch (ext) {
    case "py":
      return <FileCode {...iconProps} />;
    case "json":
      return <FileJson {...iconProps} />;
    case "csv":
      return <FileSpreadsheet {...iconProps} />;
    case "png":
    case "jpg":
    case "svg":
      return <Image {...iconProps} />;
    case "bib":
      return <BookOpen {...iconProps} />;
    default:
      return <FileText {...iconProps} />;
  }
}

function getExtClass(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    py: "py",
    json: "json",
    csv: "csv",
    png: "png",
    jpg: "png",
    svg: "png",
    pdf: "pdf",
    tex: "tex",
    md: "md",
    bib: "bib",
  };
  return map[ext] || "md";
}

export default function FileCard({ name, path, size, meta }: Props) {
  const handleClick = useCallback(() => {
    window.api.openFile(path);
  }, [path]);

  return (
    <div className="file-card" onClick={handleClick}>
      <div className={`fc-icon ${getExtClass(name)}`}>
        {getIcon(name)}
      </div>
      <div className="fc-info">
        <div className="fc-name">{name}</div>
        <div className="fc-meta">
          {meta || (size ? formatFileSize(size) : "刚刚生成")}
        </div>
      </div>
      <div className="fc-open">
        <ExternalLink size={16} />
      </div>
    </div>
  );
}
