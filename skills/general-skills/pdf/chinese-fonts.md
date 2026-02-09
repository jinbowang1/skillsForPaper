# PDF 中文字体配置指南

本文档介绍如何在 Python PDF 生成工具中正确配置和使用中文字体。

## 推荐字体

| 字体 | 来源 | 特点 | 下载 |
|------|------|------|------|
| **Noto Sans CJK SC** | Google | 开源、覆盖全、现代 | [GitHub](https://github.com/googlefonts/noto-cjk) |
| **Noto Serif CJK SC** | Google | 开源、宋体风格 | [GitHub](https://github.com/googlefonts/noto-cjk) |
| **Source Han Sans** | Adobe | 开源、思源黑体 | [GitHub](https://github.com/adobe-fonts/source-han-sans) |
| **SimSun** | Windows | 系统自带、宋体 | Windows 内置 |
| **SimHei** | Windows | 系统自带、黑体 | Windows 内置 |
| **PingFang SC** | macOS | 系统自带、苹方 | macOS 内置 |

## ReportLab 中文配置

### 注册 TrueType 字体

```python
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
import os

# 字体路径（根据系统调整）
FONT_PATHS = {
    'darwin': {  # macOS
        'regular': '/System/Library/Fonts/PingFang.ttc',
        'bold': '/System/Library/Fonts/PingFang.ttc',
    },
    'win32': {  # Windows
        'regular': 'C:/Windows/Fonts/simsun.ttc',
        'bold': 'C:/Windows/Fonts/simhei.ttf',
    },
    'linux': {  # Linux
        'regular': '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
        'bold': '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc',
    }
}

def register_chinese_fonts():
    """注册中文字体"""
    import sys
    platform = sys.platform

    paths = FONT_PATHS.get(platform, FONT_PATHS['linux'])

    if os.path.exists(paths['regular']):
        pdfmetrics.registerFont(TTFont('ChineseRegular', paths['regular']))
    if os.path.exists(paths['bold']):
        pdfmetrics.registerFont(TTFont('ChineseBold', paths['bold']))

    return 'ChineseRegular', 'ChineseBold'

# 使用示例
regular_font, bold_font = register_chinese_fonts()

c = canvas.Canvas("chinese_doc.pdf", pagesize=A4)
c.setFont(regular_font, 12)
c.drawString(100, 750, "这是中文内容测试")
c.setFont(bold_font, 14)
c.drawString(100, 720, "这是粗体中文标题")
c.save()
```

### 使用 Noto 字体（推荐）

```python
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# 下载 Noto Sans CJK SC 后注册
# 下载地址: https://github.com/googlefonts/noto-cjk/releases
pdfmetrics.registerFont(TTFont('NotoSansSC', 'NotoSansCJKsc-Regular.otf'))
pdfmetrics.registerFont(TTFont('NotoSansSC-Bold', 'NotoSansCJKsc-Bold.otf'))

# 注册字体族（支持自动 bold/italic 切换）
from reportlab.pdfbase.pdfmetrics import registerFontFamily
registerFontFamily(
    'NotoSansSC',
    normal='NotoSansSC',
    bold='NotoSansSC-Bold',
)
```

### Platypus 中使用中文

```python
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.pagesizes import A4

# 注册字体后创建中文样式
styles = getSampleStyleSheet()

# 创建中文段落样式
chinese_style = ParagraphStyle(
    'Chinese',
    parent=styles['Normal'],
    fontName='NotoSansSC',
    fontSize=12,
    leading=18,  # 行间距
)

chinese_title = ParagraphStyle(
    'ChineseTitle',
    parent=styles['Title'],
    fontName='NotoSansSC-Bold',
    fontSize=18,
    leading=24,
    spaceAfter=12,
)

# 创建文档
doc = SimpleDocTemplate("report.pdf", pagesize=A4)
story = []

story.append(Paragraph("研究报告标题", chinese_title))
story.append(Spacer(1, 12))
story.append(Paragraph("这是报告的正文内容。中文排版需要注意行间距和字体大小的搭配。", chinese_style))

doc.build(story)
```

## WeasyPrint 中文配置

### CSS 字体设置

```css
/* styles.css */
@font-face {
    font-family: 'Noto Sans CJK SC';
    src: local('Noto Sans CJK SC'),
         url('/path/to/NotoSansCJKsc-Regular.otf') format('opentype');
    font-weight: normal;
}

@font-face {
    font-family: 'Noto Sans CJK SC';
    src: local('Noto Sans CJK SC Bold'),
         url('/path/to/NotoSansCJKsc-Bold.otf') format('opentype');
    font-weight: bold;
}

body {
    font-family: 'Noto Sans CJK SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
    font-size: 12pt;
    line-height: 1.8;
}

h1, h2, h3 {
    font-weight: bold;
}

/* 中文排版优化 */
p {
    text-align: justify;
    text-justify: inter-ideograph;
}
```

### Python 调用

```python
from weasyprint import HTML, CSS

html_content = """
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <h1>研究报告</h1>
    <p>这是一段中文内容，WeasyPrint 可以很好地处理中文排版。</p>
</body>
</html>
"""

# 生成 PDF
HTML(string=html_content).write_pdf(
    'output.pdf',
    stylesheets=[CSS('styles.css')]
)
```

### 性能优化提示

WeasyPrint 处理 CJK 字体时可能较慢，优化建议：

1. **预加载字体**：将字体放在本地而非网络加载
2. **字体子集化**：只嵌入使用到的字符
3. **缓存 CSS**：避免重复解析样式

```python
# 使用 fonttools 进行字体子集化
from fontTools import subset

# 只保留文档中使用的字符
subset.main([
    'NotoSansCJKsc-Regular.otf',
    '--text-file=document.txt',
    '--output-file=subset.otf'
])
```

## Pandoc + XeLaTeX 中文配置

### YAML 元数据配置

```yaml
---
title: "研究论文标题"
author: "作者姓名"
date: "2025年2月"
documentclass: article
CJKmainfont: "Noto Sans CJK SC"
CJKsansfont: "Noto Sans CJK SC"
CJKmonofont: "Noto Sans Mono CJK SC"
geometry: margin=2.5cm
output:
  pdf_document:
    latex_engine: xelatex
---
```

### 命令行调用

```bash
pandoc paper.md -o paper.pdf \
    --pdf-engine=xelatex \
    -V CJKmainfont="Noto Sans CJK SC" \
    -V geometry:margin=2.5cm
```

## 常见问题

### 1. 字体找不到

```python
# 列出系统可用字体
import matplotlib.font_manager as fm

for font in fm.findSystemFonts():
    if 'cjk' in font.lower() or 'noto' in font.lower():
        print(font)
```

### 2. 字符显示为方块

原因：字体不支持该字符
解决：使用覆盖更全的字体（如 Noto Sans CJK）

### 3. 中英文混排间距问题

```css
/* CSS 解决方案 */
body {
    word-spacing: 0.1em;
}

/* 或使用 letter-spacing */
p {
    letter-spacing: 0.02em;
}
```

## 字体安装

### macOS

```bash
# 使用 Homebrew
brew tap homebrew/cask-fonts
brew install --cask font-noto-sans-cjk-sc
```

### Ubuntu/Debian

```bash
sudo apt install fonts-noto-cjk fonts-noto-cjk-extra
```

### Windows

下载字体文件后双击安装，或复制到 `C:\Windows\Fonts\`

### 验证安装

```bash
# Linux/macOS
fc-list :lang=zh

# 或
fc-list | grep -i "noto.*cjk"
```
