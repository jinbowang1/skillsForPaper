import React, { useState } from "react";
import { X, ChevronRight, Download } from "lucide-react";
import { useUIStore } from "../../stores/ui-store";
import { useToastStore } from "../../stores/toast-store";

interface FaqEntry {
  question: string;
  answer: string;
}

const FAQ_DATA: FaqEntry[] = [
  {
    question: "网络连接失败怎么办？",
    answer:
      "MiniMax 和 Kimi 模型可直连，无需 VPN。Claude 模型需科学上网。如遇连接问题：①确认网络正常 ②切换到 MiniMax 模型试试 ③检查是否开启了 VPN/代理",
  },
  {
    question: "遇到 bug 怎么反馈？",
    answer:
      "点击下方「导出日志」按钮，将生成的文件发给管理员，并附上问题描述和截图。常见的临时解决方法：关闭应用后重新打开。",
  },
  {
    question: "几个模型有什么区别？",
    answer:
      "MiniMax M2.1 — 速度快、免 VPN，适合日常写作；Kimi K2.5 — 支持图片分析；Qwen3 Max — 中文能力强；Claude Opus 4.5 — 最强综合能力，但需 VPN。",
  },
  {
    question: "生成的文件在哪里？",
    answer:
      '所有文件保存在项目的 output/ 目录下，左侧\u201c书桌\u201d会自动展示，也可点击文件名直接打开。',
  },
  {
    question: "可以同时发多条消息吗？",
    answer:
      "不可以。请等大师兄回复完成后再发送下一条。如果回复太久，可点击红色停止按钮中断。",
  },
  {
    question: "支持哪些图片格式？",
    answer:
      "支持 PNG、JPEG、WebP、GIF，大小不超过 20MB。可以通过按钮上传、粘贴、或拖拽。",
  },
];

export default function FaqPanel() {
  const closePanel = useUIStore((s) => s.closePanel);
  const showToast = useToastStore((s) => s.show);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);

  const toggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  const handleExportLogs = async () => {
    setExporting(true);
    try {
      const result = await window.api.exportLogsAndReveal();
      if (result.ok) {
        showToast("日志已导出", "success");
      } else if (result.error !== "cancelled") {
        showToast(`导出失败: ${result.error}`, "error");
      }
    } catch (err: any) {
      showToast(`导出失败: ${err.message}`, "error");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="sidebar-panel">
      <div className="sidebar-panel-header">
        <span className="sidebar-panel-title">常见问题</span>
        <button className="icon-btn sidebar-panel-close" onClick={closePanel}>
          <X size={14} />
        </button>
      </div>
      <div className="sidebar-panel-body faq-body">
        {FAQ_DATA.map((item, i) => (
          <div
            key={i}
            className={`faq-item ${openIndex === i ? "open" : ""}`}
          >
            <div className="faq-question" onClick={() => toggle(i)}>
              <span>Q: {item.question}</span>
              <ChevronRight size={14} className="faq-chevron" />
            </div>
            <div className="faq-answer">
              <div className="faq-answer-inner">A: {item.answer}</div>
            </div>
          </div>
        ))}

        <div className="faq-export-section">
          <button
            className="faq-export-btn"
            onClick={handleExportLogs}
            disabled={exporting}
          >
            <Download size={14} />
            {exporting ? "导出中..." : "导出日志"}
          </button>
          <p className="faq-export-hint">
            反馈问题时请附上日志文件，方便排查
          </p>
        </div>
      </div>
    </div>
  );
}
