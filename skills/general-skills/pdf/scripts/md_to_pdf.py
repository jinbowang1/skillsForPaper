#!/usr/bin/env python3
"""
Markdown to PDF 转换脚本

支持多种转换引擎：
- pandoc: 使用 Pandoc + XeLaTeX（推荐，最佳排版）
- weasyprint: 使用 WeasyPrint（纯 Python，CSS 样式）
- typst: 使用 Pandoc + Typst（现代、快速）

用法：
    python md_to_pdf.py input.md                    # 默认使用 pandoc
    python md_to_pdf.py input.md -o output.pdf      # 指定输出文件
    python md_to_pdf.py input.md -e weasyprint      # 使用 weasyprint
    python md_to_pdf.py input.md -t eisvogel        # 使用 eisvogel 模板
"""

import argparse
import subprocess
import sys
import os
from pathlib import Path


def check_command(cmd: str) -> bool:
    """检查命令是否可用"""
    try:
        subprocess.run([cmd, '--version'], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def convert_with_pandoc(input_file: str, output_file: str, template: str = None,
                        cjk_font: str = "Noto Sans CJK SC", extra_args: list = None):
    """
    使用 Pandoc + XeLaTeX 转换 Markdown 为 PDF

    Args:
        input_file: 输入 Markdown 文件
        output_file: 输出 PDF 文件
        template: LaTeX 模板名称（如 eisvogel）
        cjk_font: 中文字体名称
        extra_args: 额外的 pandoc 参数
    """
    if not check_command('pandoc'):
        raise RuntimeError("pandoc 未安装，请先安装: https://pandoc.org/installing.html")

    cmd = [
        'pandoc', input_file,
        '-o', output_file,
        '--pdf-engine=xelatex',
        '-V', f'CJKmainfont={cjk_font}',
        '-V', 'geometry:margin=2.5cm',
        '-V', 'fontsize=12pt',
        '--highlight-style=tango',
    ]

    if template:
        cmd.extend(['--template', template])

    if extra_args:
        cmd.extend(extra_args)

    print(f"执行: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        print(f"错误: {result.stderr}", file=sys.stderr)
        raise RuntimeError(f"Pandoc 转换失败: {result.stderr}")

    print(f"✓ 已生成: {output_file}")
    return output_file


def convert_with_weasyprint(input_file: str, output_file: str, css_file: str = None):
    """
    使用 WeasyPrint 转换 Markdown 为 PDF

    Args:
        input_file: 输入 Markdown 文件
        output_file: 输出 PDF 文件
        css_file: 可选的 CSS 样式文件
    """
    try:
        import markdown
        from weasyprint import HTML, CSS
    except ImportError:
        raise RuntimeError("请先安装依赖: pip install weasyprint markdown")

    # 读取 Markdown
    with open(input_file, 'r', encoding='utf-8') as f:
        md_content = f.read()

    # 转换为 HTML
    html_content = markdown.markdown(
        md_content,
        extensions=['tables', 'fenced_code', 'toc', 'meta', 'footnotes']
    )

    # 默认样式
    default_css = """
    @page {
        size: A4;
        margin: 2.5cm;
        @bottom-center {
            content: counter(page);
            font-size: 10pt;
        }
    }
    body {
        font-family: 'Noto Sans CJK SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
        font-size: 12pt;
        line-height: 1.8;
        color: #333;
    }
    h1 { font-size: 20pt; margin-top: 1.5em; margin-bottom: 0.5em; }
    h2 { font-size: 16pt; margin-top: 1.2em; margin-bottom: 0.4em; }
    h3 { font-size: 14pt; margin-top: 1em; margin-bottom: 0.3em; }
    p { text-align: justify; margin-bottom: 0.8em; }
    code {
        font-family: 'Noto Sans Mono CJK SC', 'Consolas', monospace;
        background: #f5f5f5;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 0.9em;
    }
    pre {
        background: #f5f5f5;
        padding: 1em;
        border-radius: 5px;
        overflow-x: auto;
        font-size: 0.85em;
        line-height: 1.5;
    }
    pre code {
        background: none;
        padding: 0;
    }
    table {
        border-collapse: collapse;
        width: 100%;
        margin: 1em 0;
    }
    th, td {
        border: 1px solid #ddd;
        padding: 10px;
        text-align: left;
    }
    th {
        background: #f5f5f5;
        font-weight: bold;
    }
    blockquote {
        border-left: 4px solid #ddd;
        margin: 1em 0;
        padding-left: 1em;
        color: #666;
    }
    img {
        max-width: 100%;
        height: auto;
    }
    """

    # 包装为完整 HTML
    full_html = f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>Document</title>
</head>
<body>
{html_content}
</body>
</html>"""

    # 准备样式
    stylesheets = [CSS(string=default_css)]
    if css_file and os.path.exists(css_file):
        stylesheets.append(CSS(filename=css_file))

    # 生成 PDF
    HTML(string=full_html, base_url=os.path.dirname(os.path.abspath(input_file))).write_pdf(
        output_file,
        stylesheets=stylesheets
    )

    print(f"✓ 已生成: {output_file}")
    return output_file


def convert_with_typst(input_file: str, output_file: str):
    """
    使用 Pandoc + Typst 转换 Markdown 为 PDF

    Args:
        input_file: 输入 Markdown 文件
        output_file: 输出 PDF 文件
    """
    if not check_command('pandoc'):
        raise RuntimeError("pandoc 未安装")
    if not check_command('typst'):
        raise RuntimeError("typst 未安装，请先安装: cargo install typst-cli")

    cmd = [
        'pandoc', input_file,
        '-o', output_file,
        '--pdf-engine=typst',
    ]

    print(f"执行: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        print(f"错误: {result.stderr}", file=sys.stderr)
        raise RuntimeError(f"转换失败: {result.stderr}")

    print(f"✓ 已生成: {output_file}")
    return output_file


def main():
    parser = argparse.ArgumentParser(
        description='Markdown to PDF 转换工具',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
    python md_to_pdf.py paper.md
    python md_to_pdf.py paper.md -o report.pdf
    python md_to_pdf.py paper.md -e weasyprint -c style.css
    python md_to_pdf.py paper.md -t eisvogel --cjk-font "SimSun"
        """
    )

    parser.add_argument('input', help='输入 Markdown 文件')
    parser.add_argument('-o', '--output', help='输出 PDF 文件（默认与输入同名）')
    parser.add_argument('-e', '--engine',
                        choices=['pandoc', 'weasyprint', 'typst'],
                        default='pandoc',
                        help='转换引擎（默认: pandoc）')
    parser.add_argument('-t', '--template', help='Pandoc 模板名称（如 eisvogel）')
    parser.add_argument('-c', '--css', help='CSS 样式文件（仅 weasyprint）')
    parser.add_argument('--cjk-font', default='Noto Sans CJK SC',
                        help='中文字体（默认: Noto Sans CJK SC）')

    args = parser.parse_args()

    # 检查输入文件
    input_path = Path(args.input)
    if not input_path.exists():
        print(f"错误: 输入文件不存在: {args.input}", file=sys.stderr)
        sys.exit(1)

    # 确定输出文件
    output_path = Path(args.output) if args.output else input_path.with_suffix('.pdf')

    try:
        if args.engine == 'pandoc':
            convert_with_pandoc(
                str(input_path),
                str(output_path),
                template=args.template,
                cjk_font=args.cjk_font
            )
        elif args.engine == 'weasyprint':
            convert_with_weasyprint(
                str(input_path),
                str(output_path),
                css_file=args.css
            )
        elif args.engine == 'typst':
            convert_with_typst(str(input_path), str(output_path))

    except Exception as e:
        print(f"转换失败: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
