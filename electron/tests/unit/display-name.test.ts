import { describe, it, expect } from "vitest";
import { getDisplayName } from "../../renderer/utils/format";

describe("getDisplayName", () => {
  it("maps OAE_Paper.tex to 论文", () => {
    expect(getDisplayName("OAE_Paper.tex")).toBe("论文");
  });

  it("maps oae_paper.tex to 论文 (lowercase)", () => {
    expect(getDisplayName("oae_paper.tex")).toBe("论文");
  });

  it("maps OPENING_REPORT.md to 开题报告", () => {
    expect(getDisplayName("OPENING_REPORT.md")).toBe("开题报告");
  });

  it("maps opening_report.docx to 开题报告 (lowercase)", () => {
    expect(getDisplayName("opening_report.docx")).toBe("开题报告");
  });

  it("maps Paper_Outline.md to 大纲", () => {
    expect(getDisplayName("Paper_Outline.md")).toBe("大纲");
  });

  it("maps RESEARCH_PLAN.md to 研究计划", () => {
    expect(getDisplayName("RESEARCH_PLAN.md")).toBe("研究计划");
  });

  it("maps Experiment_Design.md to 实验设计", () => {
    expect(getDisplayName("Experiment_Design.md")).toBe("实验设计");
  });

  it("maps Literature_Review.tex to 文献综述", () => {
    expect(getDisplayName("Literature_Review.tex")).toBe("文献综述");
  });

  it("maps oae_experiment.py to 实验脚本", () => {
    expect(getDisplayName("oae_experiment.py")).toBe("实验脚本");
  });

  it("maps plot_results.py to 绘图", () => {
    expect(getDisplayName("plot_results.py")).toBe("绘图");
  });

  it("maps references.bib to 引用", () => {
    expect(getDisplayName("references.bib")).toBe("引用");
  });

  it("maps thesis.tex to 毕业论文", () => {
    expect(getDisplayName("thesis.tex")).toBe("毕业论文");
  });

  it("maps experiment_results.json to 实验结果", () => {
    expect(getDisplayName("experiment_results.json")).toBe("实验结果");
  });

  it("returns base name for unknown files", () => {
    expect(getDisplayName("custom_file.py")).toBe("custom_file");
    expect(getDisplayName("README.md")).toBe("README");
  });

  it("strips extension correctly", () => {
    expect(getDisplayName("file.with.dots.txt")).toBe("file.with.dots");
  });
});
