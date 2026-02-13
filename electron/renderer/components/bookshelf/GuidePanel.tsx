import React from "react";
import { X } from "lucide-react";
import { useUIStore } from "../../stores/ui-store";

export default function GuidePanel() {
  const closePanel = useUIStore((s) => s.closePanel);

  return (
    <div className="sidebar-panel">
      <div className="sidebar-panel-header">
        <span className="sidebar-panel-title">使用指南</span>
        <button className="icon-btn sidebar-panel-close" onClick={closePanel}>
          <X size={14} />
        </button>
      </div>
      <div className="sidebar-panel-body">
        <div className="guide-section">
          <h3>大师兄是什么</h3>
          <p>
            大师兄是你的 AI 科研写作助手。它可以帮你完成文献调研、实验分析、论文撰写等学术任务。
          </p>
        </div>

        <div className="guide-section">
          <h3>快速上手</h3>
          <ol>
            <li><strong>发起对话</strong> — 在右侧输入框描述你的需求，比如"帮我写论文的引言部分"</li>
            <li><strong>上传图片</strong> — 点击图片按钮或直接粘贴截图，让大师兄分析实验结果</li>
            <li><strong>查看产出</strong> — 大师兄生成的文件会出现在左侧"书桌"中，点击可打开</li>
          </ol>
        </div>

        <div className="guide-section">
          <h3>核心用例</h3>
          <ul>
            <li><strong>文献综述</strong>：给出关键词或论文，让大师兄帮你梳理研究脉络</li>
            <li><strong>论文撰写</strong>：逐章节写作，支持 LaTeX/Markdown/Word 格式</li>
            <li><strong>实验分析</strong>：上传数据或截图，大师兄帮你解读和可视化</li>
            <li><strong>润色修改</strong>：粘贴段落，让大师兄帮你改进表达</li>
          </ul>
        </div>

        <div className="guide-section">
          <h3>好论文的标准</h3>
          <ul>
            <li><strong>逻辑清晰</strong>：问题 → 动机 → 方法 → 实验 → 结论，环环相扣</li>
            <li><strong>写作规范</strong>：用词准确，段落结构合理，引用格式统一</li>
            <li><strong>图表专业</strong>：图表自解释，标题完整，分辨率高</li>
            <li><strong>创新明确</strong>：明确指出与已有工作的区别和贡献</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
