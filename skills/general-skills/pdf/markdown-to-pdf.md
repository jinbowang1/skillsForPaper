# Markdown 转 PDF 完整指南

本文档介绍多种将 Markdown 转换为高质量 PDF 的方法，适用于学术写作、技术文档和报告生成。

## 方案对比

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **Pandoc + LaTeX** | 排版最佳、功能最全 | 需要 TeX 环境 | 学术论文、正式文档 |
| **Pandoc + Typst** | 快速、现代、原生中文 | 模板较少 | 快速文档、报告 |
| **WeasyPrint** | 纯 Python、CSS 样式 | CJK 较慢 | Web 风格文档 |
| **markdown-pdf** | 简单易用 | 功能有限 | 简单文档 |

## 方案一：Pandoc + LaTeX（推荐）

### 安装

```bash
# macOS
brew install pandoc
brew install --cask mactex  # 完整版，约 4GB
# 或 brew install --cask basictex  # 精简版

# Ubuntu/Debian
sudo apt install pandoc texlive-xetex texlive-lang-chinese

# Windows
# 下载 Pandoc: https://pandoc.org/installing.html
# 下载 MiKTeX: https://miktex.org/download
```

### 基础用法

```bash
# 最简单的转换
pandoc input.md -o output.pdf

# 指定 PDF 引擎（中文必须用 xelatex）
pandoc input.md -o output.pdf --pdf-engine=xelatex

# 使用模板
pandoc input.md -o output.pdf --pdf-engine=xelatex --template=eisvogel
```

### Python 封装（pypandoc）

```python
import pypandoc

def markdown_to_pdf(input_file, output_file, template=None, extra_args=None):
    """
    将 Markdown 转换为 PDF

    Args:
        input_file: 输入 Markdown 文件路径
        output_file: 输出 PDF 文件路径
        template: 可选的 LaTeX 模板名称
        extra_args: 额外的 pandoc 参数
    """
    args = [
        '--pdf-engine=xelatex',
        '-V', 'CJKmainfont=Noto Sans CJK SC',
        '-V', 'geometry:margin=2.5cm',
    ]

    if template:
        args.extend(['--template', template])

    if extra_args:
        args.extend(extra_args)

    pypandoc.convert_file(
        input_file,
        'pdf',
        outputfile=output_file,
        extra_args=args
    )

    return output_file

# 使用示例
markdown_to_pdf('paper.md', 'paper.pdf')
```

### Markdown 文件格式（含元数据）

```markdown
---
title: "研究论文标题"
author: "作者姓名"
date: "2025年2月9日"
abstract: |
  这是论文摘要。摘要应简明扼要地描述研究目的、方法、
  主要发现和结论。
keywords: [关键词1, 关键词2, 关键词3]
lang: zh-CN
CJKmainfont: "Noto Sans CJK SC"
geometry: margin=2.5cm
fontsize: 12pt
linestretch: 1.5
bibliography: references.bib
csl: chinese-gb7714-2005-numeric.csl
---

# 引言

这是正文内容。可以使用 **粗体** 和 *斜体*。

## 方法

### 数据收集

数据收集的详细描述...

## 结果

```python
# 代码块示例
import pandas as pd
df = pd.read_csv('data.csv')
```

## 讨论

讨论部分的内容...

## 参考文献
```

## 方案二：Pandoc + Typst（现代方案）

### 安装

```bash
# macOS
brew install typst

# 或使用 cargo
cargo install typst-cli
```

### 基础用法

```bash
# Markdown → Typst → PDF
pandoc input.md -o output.pdf --pdf-engine=typst
```

### Python 封装

```python
import subprocess
import tempfile
import os

def markdown_to_pdf_typst(input_file, output_file):
    """使用 Pandoc + Typst 转换 Markdown 为 PDF"""

    # 先转换为 Typst 格式
    with tempfile.NamedTemporaryFile(suffix='.typ', delete=False) as tmp:
        tmp_path = tmp.name

    try:
        # Markdown → Typst
        subprocess.run([
            'pandoc', input_file,
            '-o', tmp_path,
            '-t', 'typst'
        ], check=True)

        # Typst → PDF
        subprocess.run([
            'typst', 'compile', tmp_path, output_file
        ], check=True)

    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)

    return output_file
```

### Typst 模板示例

```typst
// template.typ
#let project(title: "", authors: (), date: none, body) = {
  set document(author: authors, title: title)
  set page(numbering: "1", number-align: center)
  set text(font: ("Noto Sans CJK SC", "Linux Libertine"), lang: "zh")

  // Title
  align(center)[
    #block(text(weight: 700, 1.75em, title))
    #v(1em, weak: true)
    #date
  ]

  // Author
  pad(
    top: 0.5em,
    bottom: 0.5em,
    x: 2em,
    grid(
      columns: (1fr,) * calc.min(3, authors.len()),
      gutter: 1em,
      ..authors.map(author => align(center, strong(author))),
    ),
  )

  // Main body
  set par(justify: true)
  body
}

// 使用模板
#show: project.with(
  title: "论文标题",
  authors: ("作者一", "作者二"),
  date: "2025年2月",
)

= 引言

这是正文内容...
```

## 方案三：WeasyPrint（纯 Python）

### 安装

```bash
pip install weasyprint markdown
```

### 基础用法

```python
import markdown
from weasyprint import HTML, CSS

def markdown_to_pdf_weasyprint(input_file, output_file, css_file=None):
    """使用 WeasyPrint 将 Markdown 转换为 PDF"""

    # 读取 Markdown
    with open(input_file, 'r', encoding='utf-8') as f:
        md_content = f.read()

    # 转换为 HTML
    html_content = markdown.markdown(
        md_content,
        extensions=['tables', 'fenced_code', 'toc', 'meta']
    )

    # 包装为完整 HTML
    full_html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
    </head>
    <body>
        {html_content}
    </body>
    </html>
    """

    # 默认样式
    default_css = """
    @page {
        size: A4;
        margin: 2.5cm;
    }
    body {
        font-family: 'Noto Sans CJK SC', sans-serif;
        font-size: 12pt;
        line-height: 1.8;
    }
    h1 { font-size: 18pt; margin-top: 1em; }
    h2 { font-size: 16pt; margin-top: 0.8em; }
    h3 { font-size: 14pt; margin-top: 0.6em; }
    code {
        font-family: 'Noto Sans Mono CJK SC', monospace;
        background: #f5f5f5;
        padding: 2px 4px;
    }
    pre {
        background: #f5f5f5;
        padding: 1em;
        overflow-x: auto;
    }
    table {
        border-collapse: collapse;
        width: 100%;
    }
    th, td {
        border: 1px solid #ddd;
        padding: 8px;
        text-align: left;
    }
    """

    stylesheets = [CSS(string=default_css)]
    if css_file:
        stylesheets.append(CSS(filename=css_file))

    # 生成 PDF
    HTML(string=full_html).write_pdf(output_file, stylesheets=stylesheets)

    return output_file

# 使用示例
markdown_to_pdf_weasyprint('document.md', 'document.pdf')
```

### 高级样式模板

```css
/* academic-style.css */
@page {
    size: A4;
    margin: 2.5cm 2cm;

    @top-center {
        content: string(title);
        font-size: 10pt;
        color: #666;
    }

    @bottom-center {
        content: counter(page);
        font-size: 10pt;
    }
}

@page :first {
    @top-center { content: none; }
}

body {
    font-family: 'Noto Serif CJK SC', 'Times New Roman', serif;
    font-size: 12pt;
    line-height: 1.8;
    text-align: justify;
}

h1 {
    string-set: title content();
    font-size: 18pt;
    text-align: center;
    margin-bottom: 2em;
}

/* 摘要样式 */
.abstract {
    margin: 2em 3em;
    font-size: 11pt;
    background: #f9f9f9;
    padding: 1em;
    border-left: 3px solid #333;
}

/* 图表标题 */
figure {
    text-align: center;
    margin: 1.5em 0;
}

figcaption {
    font-size: 10pt;
    color: #666;
    margin-top: 0.5em;
}

/* 参考文献 */
.references {
    font-size: 10pt;
}

.references li {
    margin-bottom: 0.5em;
}
```

## 方案四：使用 Python-Markdown 扩展

### 安装扩展

```bash
pip install markdown pymdown-extensions
```

### 丰富的 Markdown 扩展

```python
import markdown

md = markdown.Markdown(extensions=[
    'tables',              # 表格
    'fenced_code',         # 代码块
    'codehilite',          # 代码高亮
    'toc',                 # 目录
    'meta',                # 元数据
    'footnotes',           # 脚注
    'attr_list',           # 属性列表
    'pymdownx.arithmatex', # 数学公式
    'pymdownx.superfences', # 高级代码块
    'pymdownx.tasklist',   # 任务列表
])

html = md.convert(markdown_text)
```

## 完整工作流示例

```python
#!/usr/bin/env python3
"""
Markdown to PDF 转换工具
支持多种后端：pandoc, weasyprint, typst
"""

import os
import subprocess
import argparse
from pathlib import Path

def convert_with_pandoc(input_file, output_file, template=None):
    """使用 Pandoc + XeLaTeX"""
    cmd = [
        'pandoc', input_file,
        '-o', output_file,
        '--pdf-engine=xelatex',
        '-V', 'CJKmainfont=Noto Sans CJK SC',
        '-V', 'geometry:margin=2.5cm',
        '-V', 'fontsize=12pt',
        '--highlight-style=tango',
    ]
    if template:
        cmd.extend(['--template', template])

    subprocess.run(cmd, check=True)
    print(f"✓ 已生成: {output_file}")

def convert_with_weasyprint(input_file, output_file, css_file=None):
    """使用 WeasyPrint"""
    import markdown
    from weasyprint import HTML, CSS

    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

    html = markdown.markdown(content, extensions=['tables', 'fenced_code', 'toc'])

    full_html = f"""<!DOCTYPE html>
    <html><head><meta charset="UTF-8"></head>
    <body>{html}</body></html>"""

    stylesheets = []
    if css_file:
        stylesheets.append(CSS(filename=css_file))

    HTML(string=full_html).write_pdf(output_file, stylesheets=stylesheets)
    print(f"✓ 已生成: {output_file}")

def main():
    parser = argparse.ArgumentParser(description='Markdown to PDF 转换工具')
    parser.add_argument('input', help='输入 Markdown 文件')
    parser.add_argument('-o', '--output', help='输出 PDF 文件')
    parser.add_argument('-e', '--engine', choices=['pandoc', 'weasyprint', 'typst'],
                        default='pandoc', help='转换引擎')
    parser.add_argument('-t', '--template', help='模板文件')
    parser.add_argument('-c', '--css', help='CSS 样式文件（仅 weasyprint）')

    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = args.output or input_path.with_suffix('.pdf')

    if args.engine == 'pandoc':
        convert_with_pandoc(str(input_path), str(output_path), args.template)
    elif args.engine == 'weasyprint':
        convert_with_weasyprint(str(input_path), str(output_path), args.css)
    elif args.engine == 'typst':
        subprocess.run([
            'pandoc', str(input_path),
            '-o', str(output_path),
            '--pdf-engine=typst'
        ], check=True)
        print(f"✓ 已生成: {output_path}")

if __name__ == '__main__':
    main()
```

## 常见问题

### 1. 中文显示为乱码

确保使用 XeLaTeX 并指定中文字体：
```bash
pandoc input.md -o output.pdf --pdf-engine=xelatex -V CJKmainfont="Noto Sans CJK SC"
```

### 2. 代码块没有语法高亮

添加 `--highlight-style` 参数：
```bash
pandoc input.md -o output.pdf --highlight-style=tango
```

### 3. 图片路径问题

使用相对于 Markdown 文件的路径，或使用绝对路径。

### 4. 表格超出页面

在 YAML 元数据中添加：
```yaml
header-includes:
  - \usepackage{longtable}
  - \usepackage{booktabs}
```

### 5. 数学公式支持

Pandoc 默认支持 LaTeX 数学公式：
```markdown
行内公式：$E = mc^2$

行间公式：
$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$
```
