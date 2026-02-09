# 学术论文模板使用指南

本文档介绍如何使用各种模板生成专业的学术文档，包括研究论文、技术报告、简历和演示文稿。

## Pandoc 学术模板

### Eisvogel 模板（推荐）

[Eisvogel](https://github.com/Wandmalfarbe/pandoc-latex-template) 是最流行的 Pandoc LaTeX 模板，适合技术文档和学术报告。

#### 安装

```bash
# 下载模板
mkdir -p ~/.pandoc/templates
curl -L https://github.com/Wandmalfarbe/pandoc-latex-template/releases/latest/download/Eisvogel.tar.gz | tar xz -C ~/.pandoc/templates
```

#### 使用示例

```markdown
---
title: "研究报告标题"
author: [作者姓名]
date: "2025年2月"
subject: "计算机科学"
keywords: [机器学习, 深度学习, 神经网络]
subtitle: "副标题"
lang: "zh-CN"
titlepage: true
titlepage-color: "3C9F53"
titlepage-text-color: "FFFFFF"
titlepage-rule-color: "FFFFFF"
titlepage-rule-height: 2
book: false
classoption: oneside
code-block-font-size: \scriptsize
CJKmainfont: "Noto Sans CJK SC"
---

# 摘要 {.unnumbered}

本研究探讨了...

# 引言

研究背景介绍...

# 相关工作

## 传统方法

传统方法的描述...

## 深度学习方法

深度学习方法的描述...

# 方法

## 问题定义

设 $X = \{x_1, x_2, ..., x_n\}$ 为输入数据集...

## 模型架构

```python
import torch.nn as nn

class Model(nn.Module):
    def __init__(self):
        super().__init__()
        self.layer = nn.Linear(128, 64)
```

# 实验

## 数据集

| 数据集 | 样本数 | 类别数 |
|--------|--------|--------|
| MNIST  | 60,000 | 10     |
| CIFAR  | 50,000 | 10     |

## 结果

实验结果表明...

# 结论

本文提出了...

# 参考文献
```

#### 编译命令

```bash
pandoc paper.md -o paper.pdf \
    --template eisvogel \
    --pdf-engine=xelatex \
    --listings \
    -V CJKmainfont="Noto Sans CJK SC"
```

### Academic Pandoc Template

[academic-pandoc-template](https://github.com/maehr/academic-pandoc-template) 支持多种输出格式。

#### YAML 配置

```yaml
---
title: 论文标题
author:
  - name: 作者一
    affiliation: 大学A
    email: author1@example.com
  - name: 作者二
    affiliation: 大学B
abstract: |
  这是摘要内容。应该简明扼要地描述研究目的、方法和主要发现。
bibliography: references.bib
csl: chinese-gb7714-2005-numeric.csl
---
```

## IEEE 论文模板

### 使用 Pandoc + IEEEtran

```yaml
---
title: "Paper Title"
author:
  - name: Author One
    affiliation: University A
  - name: Author Two
    affiliation: University B
documentclass: IEEEtran
classoption: conference
bibliography: references.bib
---
```

### 使用 Typst (charged-ieee)

```typst
#import "@preview/charged-ieee:0.1.3": ieee

#show: ieee.with(
  title: [A Novel Approach to Something Important],
  abstract: [
    This paper presents a novel approach...
  ],
  authors: (
    (
      name: "Author One",
      department: [Department of Computer Science],
      organization: [University A],
      email: "author1@example.edu"
    ),
  ),
  bibliography: bibliography("refs.bib"),
)

= Introduction

This paper introduces...
```

## 中文学位论文模板

### 通用中文论文模板

```markdown
---
title: "基于深度学习的图像分类研究"
author: "张三"
date: "2025年2月"
documentclass: ctexart
classoption:
  - a4paper
  - 12pt
geometry:
  - top=2.5cm
  - bottom=2.5cm
  - left=3cm
  - right=2.5cm
header-includes:
  - \usepackage{setspace}
  - \onehalfspacing
  - \usepackage{fancyhdr}
  - \pagestyle{fancy}
  - \fancyhead[C]{硕士学位论文}
---

\begin{abstract}
本文研究了基于深度学习的图像分类方法...

\textbf{关键词：} 深度学习；图像分类；卷积神经网络
\end{abstract}

# 绪论

## 研究背景

近年来，随着人工智能技术的快速发展...

## 研究意义

本研究的意义在于...

## 论文结构

本文的组织结构如下：
第一章介绍研究背景...

# 相关工作

# 方法

# 实验与分析

# 总结与展望

# 参考文献
```

## 简历/CV 模板

### 使用 Pandoc + ModernCV

```markdown
---
name: 张三
address: 北京市海淀区XX路XX号
phone: +86 138-0000-0000
email: zhangsan@example.com
github: zhangsan
linkedin: zhangsan
documentclass: moderncv
classoption: banking
colorscheme: blue
---

# 教育背景

## 博士学位 | 2020-2025
**北京大学** | 计算机科学与技术
- 研究方向：机器学习、计算机视觉
- 导师：李教授

## 硕士学位 | 2018-2020
**清华大学** | 软件工程
- GPA: 3.9/4.0

# 工作经历

## 研究实习生 | 2024.06-2024.09
**微软亚洲研究院**
- 参与大语言模型相关研究
- 发表论文 2 篇

# 技能

- **编程语言**: Python, C++, JavaScript
- **框架**: PyTorch, TensorFlow, React
- **工具**: Git, Docker, LaTeX

# 发表论文

1. Zhang S, Li M. "Paper Title." *Conference Name*, 2024.
2. Zhang S, et al. "Another Paper." *Journal Name*, 2024.
```

### 使用 Typst 简历模板

```typst
#import "@preview/modern-cv:0.6.0": *

#show: resume.with(
  author: (
    firstname: "三",
    lastname: "张",
    email: "zhangsan@example.com",
    phone: "(+86) 138-0000-0000",
    github: "zhangsan",
    positions: ("博士研究生", "机器学习研究员"),
  ),
)

= 教育背景

#resume-entry(
  title: "北京大学",
  location: "北京",
  date: "2020 - 至今",
  description: "计算机科学与技术 博士",
)

= 研究经历

#resume-entry(
  title: "微软亚洲研究院",
  location: "北京",
  date: "2024.06 - 2024.09",
  description: "研究实习生",
)

- 参与大语言模型相关研究项目
- 负责模型训练和评估
```

## 技术报告模板

### ReportLab Python 报告

```python
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# 注册中文字体
pdfmetrics.registerFont(TTFont('SimSun', 'simsun.ttc'))

# 自定义样式
styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    'ChineseTitle',
    parent=styles['Title'],
    fontName='SimSun',
    fontSize=18,
    spaceAfter=30,
    alignment=1,  # 居中
)

heading_style = ParagraphStyle(
    'ChineseHeading',
    parent=styles['Heading1'],
    fontName='SimSun',
    fontSize=14,
    spaceBefore=12,
    spaceAfter=6,
)

body_style = ParagraphStyle(
    'ChineseBody',
    parent=styles['Normal'],
    fontName='SimSun',
    fontSize=12,
    leading=18,
    firstLineIndent=24,  # 首行缩进
)

def create_report(output_file, title, sections):
    """
    创建技术报告 PDF

    Args:
        output_file: 输出文件路径
        title: 报告标题
        sections: 章节列表 [{'title': '章节标题', 'content': '内容'}, ...]
    """
    doc = SimpleDocTemplate(
        output_file,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2.5*cm,
        topMargin=2.5*cm,
        bottomMargin=2*cm
    )

    story = []

    # 标题
    story.append(Paragraph(title, title_style))
    story.append(Spacer(1, 20))

    # 章节
    for section in sections:
        story.append(Paragraph(section['title'], heading_style))
        story.append(Paragraph(section['content'], body_style))
        story.append(Spacer(1, 12))

    doc.build(story)
    return output_file

# 使用示例
sections = [
    {
        'title': '一、研究背景',
        'content': '随着人工智能技术的发展，深度学习在图像识别领域取得了显著的成果...'
    },
    {
        'title': '二、研究方法',
        'content': '本研究采用卷积神经网络作为基础模型，并引入注意力机制...'
    },
    {
        'title': '三、实验结果',
        'content': '实验表明，我们提出的方法在标准数据集上达到了最优性能...'
    },
]

create_report('research_report.pdf', '深度学习图像分类研究报告', sections)
```

## 演示文稿模板

### Pandoc Beamer（LaTeX 幻灯片）

```markdown
---
title: "研究报告"
author: "张三"
date: "2025年2月"
theme: "metropolis"
colortheme: "default"
fonttheme: "professionalfonts"
CJKmainfont: "Noto Sans CJK SC"
aspectratio: 169
---

# 引言

## 研究背景

- 背景点一
- 背景点二
- 背景点三

## 研究目标

1. 目标一
2. 目标二

# 方法

## 模型架构

![模型架构图](architecture.png){ width=80% }

## 算法流程

```python
def algorithm(x):
    return model(x)
```

# 实验

## 实验设置

| 参数 | 值 |
|------|-----|
| 学习率 | 0.001 |
| 批大小 | 32 |

## 结果

- 准确率：95.2%
- F1 分数：0.94

# 总结

## 主要贡献

- 贡献一
- 贡献二

## 未来工作

- 方向一
- 方向二

## 致谢

感谢...
```

编译命令：
```bash
pandoc slides.md -t beamer -o slides.pdf \
    --pdf-engine=xelatex \
    -V CJKmainfont="Noto Sans CJK SC"
```

## 引用样式（CSL）

### 常用中文引用样式

| 样式文件 | 说明 |
|----------|------|
| `chinese-gb7714-2005-numeric.csl` | GB/T 7714-2005 顺序编码制 |
| `chinese-gb7714-2005-author-date.csl` | GB/T 7714-2005 著者-出版年制 |
| `chinese-gb7714-2015-numeric.csl` | GB/T 7714-2015 顺序编码制 |
| `chinese-gb7714-2015-author-date.csl` | GB/T 7714-2015 著者-出版年制 |

### 下载地址

```bash
# 从 CSL 官方仓库下载
curl -O https://raw.githubusercontent.com/citation-style-language/styles/master/chinese-gb7714-2005-numeric.csl
```

### 在 Markdown 中使用

```yaml
---
bibliography: references.bib
csl: chinese-gb7714-2015-numeric.csl
---

正文中引用 [@smith2024] 和 [@zhang2023deep]。

# 参考文献
```

## 模板资源汇总

| 类型 | 资源 | 链接 |
|------|------|------|
| Pandoc 模板 | Eisvogel | https://github.com/Wandmalfarbe/pandoc-latex-template |
| Pandoc 学术 | academic-pandoc-template | https://github.com/maehr/academic-pandoc-template |
| Typst 模板库 | Typst Universe | https://typst.app/universe/ |
| CSL 样式 | Citation Styles | https://github.com/citation-style-language/styles |
| 中文学位论文 | CTeX 宏包 | https://ctan.org/pkg/ctex |
