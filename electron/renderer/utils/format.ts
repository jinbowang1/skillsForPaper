/**
 * Format file size to human readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(size < 10 ? 1 : 0)} ${units[i]}`;
}

/**
 * Format timestamp to time string (HH:mm)
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/**
 * Format relative time
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;

  return new Date(timestamp).toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric",
  });
}

/**
 * Get file extension icon class
 */
export function getExtClass(ext: string): string {
  const map: Record<string, string> = {
    ".py": "py",
    ".json": "json",
    ".csv": "csv",
    ".png": "png",
    ".jpg": "png",
    ".svg": "png",
    ".pdf": "pdf",
    ".tex": "tex",
    ".md": "md",
    ".bib": "bib",
    ".docx": "md",
  };
  return map[ext] || "md";
}

/**
 * Get display icon for file type
 */
export function getFileIcon(ext: string): string {
  const map: Record<string, string> = {
    ".py": "FileCode",
    ".json": "FileJson",
    ".csv": "FileSpreadsheet",
    ".png": "Image",
    ".jpg": "Image",
    ".svg": "Image",
    ".pdf": "FileText",
    ".tex": "FileText",
    ".md": "FileText",
    ".bib": "BookOpen",
    ".docx": "FileText",
  };
  return map[ext] || "File";
}
