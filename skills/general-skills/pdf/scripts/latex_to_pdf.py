#!/usr/bin/env python3
"""
LaTeX to PDF 编译脚本

支持多种 LaTeX 引擎：
- xelatex: 推荐，原生 Unicode 和中文支持
- pdflatex: 传统引擎，需要额外的中文包
- lualatex: 现代引擎，Lua 扩展

用法：
    python latex_to_pdf.py paper.tex                # 默认使用 xelatex
    python latex_to_pdf.py paper.tex -e pdflatex    # 使用 pdflatex
    python latex_to_pdf.py paper.tex --bibtex       # 编译参考文献
    python latex_to_pdf.py paper.tex --clean        # 编译后清理辅助文件
"""

import argparse
import subprocess
import sys
import os
import shutil
from pathlib import Path


# LaTeX 辅助文件扩展名
AUX_EXTENSIONS = [
    '.aux', '.log', '.out', '.toc', '.lof', '.lot',
    '.bbl', '.blg', '.bcf', '.run.xml',
    '.fls', '.fdb_latexmk', '.synctex.gz',
    '.nav', '.snm', '.vrb',  # beamer
    '.idx', '.ind', '.ilg',  # index
    '.glo', '.gls', '.glg',  # glossary
]


def check_command(cmd: str) -> bool:
    """检查命令是否可用"""
    return shutil.which(cmd) is not None


def run_latex(tex_file: str, engine: str = 'xelatex',
              interaction: str = 'nonstopmode') -> subprocess.CompletedProcess:
    """
    运行 LaTeX 编译

    Args:
        tex_file: LaTeX 源文件
        engine: LaTeX 引擎 (xelatex, pdflatex, lualatex)
        interaction: 交互模式

    Returns:
        subprocess.CompletedProcess
    """
    cmd = [
        engine,
        f'-interaction={interaction}',
        '-file-line-error',
        tex_file
    ]

    # 切换到 tex 文件所在目录
    work_dir = os.path.dirname(os.path.abspath(tex_file)) or '.'
    tex_name = os.path.basename(tex_file)

    print(f"执行: {' '.join(cmd)}")
    return subprocess.run(
        [engine, f'-interaction={interaction}', '-file-line-error', tex_name],
        cwd=work_dir,
        capture_output=True,
        text=True
    )


def run_bibtex(aux_file: str) -> subprocess.CompletedProcess:
    """运行 BibTeX"""
    work_dir = os.path.dirname(os.path.abspath(aux_file)) or '.'
    aux_name = os.path.basename(aux_file).replace('.aux', '')

    print(f"执行: bibtex {aux_name}")
    return subprocess.run(
        ['bibtex', aux_name],
        cwd=work_dir,
        capture_output=True,
        text=True
    )


def run_biber(bcf_file: str) -> subprocess.CompletedProcess:
    """运行 Biber（biblatex 后端）"""
    work_dir = os.path.dirname(os.path.abspath(bcf_file)) or '.'
    bcf_name = os.path.basename(bcf_file).replace('.bcf', '')

    print(f"执行: biber {bcf_name}")
    return subprocess.run(
        ['biber', bcf_name],
        cwd=work_dir,
        capture_output=True,
        text=True
    )


def clean_aux_files(tex_file: str, extensions: list = None):
    """清理 LaTeX 辅助文件"""
    if extensions is None:
        extensions = AUX_EXTENSIONS

    base = Path(tex_file).with_suffix('')
    work_dir = base.parent

    cleaned = []
    for ext in extensions:
        aux_file = work_dir / (base.name + ext)
        if aux_file.exists():
            aux_file.unlink()
            cleaned.append(aux_file.name)

    if cleaned:
        print(f"已清理: {', '.join(cleaned)}")


def compile_latex(tex_file: str, engine: str = 'xelatex',
                  bibtex: bool = False, biber: bool = False,
                  runs: int = 2, clean: bool = False) -> str:
    """
    完整编译 LaTeX 文档

    Args:
        tex_file: LaTeX 源文件
        engine: LaTeX 引擎
        bibtex: 是否运行 BibTeX
        biber: 是否运行 Biber
        runs: 编译次数
        clean: 编译后是否清理辅助文件

    Returns:
        生成的 PDF 文件路径
    """
    if not check_command(engine):
        raise RuntimeError(f"{engine} 未安装")

    tex_path = Path(tex_file)
    if not tex_path.exists():
        raise FileNotFoundError(f"文件不存在: {tex_file}")

    work_dir = tex_path.parent or Path('.')
    base_name = tex_path.stem

    # 第一次编译
    print(f"\n=== 第 1 次编译 ===")
    result = run_latex(tex_file, engine)
    if result.returncode != 0:
        print("LaTeX 编译错误:")
        print(result.stdout[-2000:] if len(result.stdout) > 2000 else result.stdout)
        raise RuntimeError("LaTeX 编译失败")

    # 运行 BibTeX/Biber
    if bibtex:
        if not check_command('bibtex'):
            raise RuntimeError("bibtex 未安装")
        aux_file = work_dir / f"{base_name}.aux"
        if aux_file.exists():
            print(f"\n=== 运行 BibTeX ===")
            result = run_bibtex(str(aux_file))
            if result.returncode != 0:
                print(f"BibTeX 警告: {result.stderr}")

    if biber:
        if not check_command('biber'):
            raise RuntimeError("biber 未安装")
        bcf_file = work_dir / f"{base_name}.bcf"
        if bcf_file.exists():
            print(f"\n=== 运行 Biber ===")
            result = run_biber(str(bcf_file))
            if result.returncode != 0:
                print(f"Biber 警告: {result.stderr}")

    # 后续编译（处理交叉引用）
    for i in range(2, runs + 1):
        print(f"\n=== 第 {i} 次编译 ===")
        result = run_latex(tex_file, engine)
        if result.returncode != 0:
            print("LaTeX 编译错误:")
            print(result.stdout[-2000:] if len(result.stdout) > 2000 else result.stdout)
            raise RuntimeError("LaTeX 编译失败")

    # 清理辅助文件
    if clean:
        print(f"\n=== 清理辅助文件 ===")
        clean_aux_files(tex_file)

    pdf_file = work_dir / f"{base_name}.pdf"
    if pdf_file.exists():
        print(f"\n✓ 已生成: {pdf_file}")
        return str(pdf_file)
    else:
        raise RuntimeError("PDF 文件未生成")


def create_minimal_template(output_file: str, title: str = "文档标题",
                           author: str = "作者", chinese: bool = True):
    """
    创建最小 LaTeX 模板

    Args:
        output_file: 输出文件路径
        title: 文档标题
        author: 作者
        chinese: 是否包含中文支持
    """
    if chinese:
        template = f"""\\documentclass[12pt, a4paper]{{article}}

% 中文支持（XeLaTeX）
\\usepackage{{ctex}}
\\usepackage{{fontspec}}

% 页面设置
\\usepackage[margin=2.5cm]{{geometry}}
\\usepackage{{setspace}}
\\onehalfspacing

% 数学支持
\\usepackage{{amsmath, amssymb, amsthm}}

% 图表支持
\\usepackage{{graphicx}}
\\usepackage{{booktabs}}
\\usepackage{{longtable}}

% 代码高亮
\\usepackage{{listings}}
\\lstset{{
    basicstyle=\\ttfamily\\small,
    breaklines=true,
    frame=single,
    numbers=left,
    numberstyle=\\tiny,
}}

% 超链接
\\usepackage{{hyperref}}
\\hypersetup{{
    colorlinks=true,
    linkcolor=blue,
    citecolor=blue,
    urlcolor=blue,
}}

% 文档信息
\\title{{{title}}}
\\author{{{author}}}
\\date{{\\today}}

\\begin{{document}}

\\maketitle

\\begin{{abstract}}
这里是摘要内容。
\\end{{abstract}}

\\tableofcontents
\\newpage

\\section{{引言}}

这是引言部分。

\\section{{方法}}

\\subsection{{数据}}

数据描述...

\\subsection{{模型}}

模型描述...

\\section{{实验}}

实验结果...

\\section{{结论}}

结论部分...

\\end{{document}}
"""
    else:
        template = f"""\\documentclass[12pt, a4paper]{{article}}

\\usepackage[margin=2.5cm]{{geometry}}
\\usepackage{{amsmath, amssymb}}
\\usepackage{{graphicx}}
\\usepackage{{hyperref}}

\\title{{{title}}}
\\author{{{author}}}
\\date{{\\today}}

\\begin{{document}}

\\maketitle

\\section{{Introduction}}

Your content here...

\\end{{document}}
"""

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(template)

    print(f"✓ 已创建模板: {output_file}")


def main():
    parser = argparse.ArgumentParser(
        description='LaTeX to PDF 编译工具',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
    python latex_to_pdf.py paper.tex
    python latex_to_pdf.py paper.tex -e pdflatex
    python latex_to_pdf.py paper.tex --bibtex --runs 3
    python latex_to_pdf.py paper.tex --clean
    python latex_to_pdf.py --template new_paper.tex  # 创建模板
        """
    )

    parser.add_argument('input', nargs='?', help='输入 LaTeX 文件')
    parser.add_argument('-e', '--engine',
                        choices=['xelatex', 'pdflatex', 'lualatex'],
                        default='xelatex',
                        help='LaTeX 引擎（默认: xelatex）')
    parser.add_argument('--bibtex', action='store_true',
                        help='运行 BibTeX 处理参考文献')
    parser.add_argument('--biber', action='store_true',
                        help='运行 Biber 处理参考文献（biblatex）')
    parser.add_argument('--runs', type=int, default=2,
                        help='编译次数（默认: 2）')
    parser.add_argument('--clean', action='store_true',
                        help='编译后清理辅助文件')
    parser.add_argument('--template', metavar='FILE',
                        help='创建新的 LaTeX 模板文件')
    parser.add_argument('--title', default='文档标题',
                        help='模板标题（与 --template 一起使用）')
    parser.add_argument('--author', default='作者',
                        help='模板作者（与 --template 一起使用）')

    args = parser.parse_args()

    # 创建模板模式
    if args.template:
        create_minimal_template(args.template, args.title, args.author)
        return

    # 编译模式
    if not args.input:
        parser.print_help()
        sys.exit(1)

    try:
        compile_latex(
            args.input,
            engine=args.engine,
            bibtex=args.bibtex,
            biber=args.biber,
            runs=args.runs,
            clean=args.clean
        )
    except Exception as e:
        print(f"编译失败: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
