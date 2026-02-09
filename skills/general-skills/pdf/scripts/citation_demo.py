#!/usr/bin/env python3
"""
学术引用和参考文献管理示例

演示如何使用 Python 处理学术引用：
1. 解析 BibTeX 文件
2. 使用 CSL 样式格式化引用
3. 生成参考文献列表
4. 与 Pandoc 集成

依赖安装：
    pip install citeproc-py citeproc-py-styles bibtexparser

用法：
    python citation_demo.py references.bib              # 生成参考文献列表
    python citation_demo.py references.bib --style apa  # 使用 APA 样式
    python citation_demo.py references.bib --format html # HTML 输出
"""

import argparse
import sys
import json
from pathlib import Path


def parse_bibtex(bib_file: str) -> list:
    """
    解析 BibTeX 文件

    Args:
        bib_file: BibTeX 文件路径

    Returns:
        解析后的条目列表
    """
    try:
        import bibtexparser
        from bibtexparser.bparser import BibTexParser
        from bibtexparser.customization import convert_to_unicode
    except ImportError:
        raise RuntimeError("请安装 bibtexparser: pip install bibtexparser")

    parser = BibTexParser(common_strings=True)
    parser.customization = convert_to_unicode

    with open(bib_file, 'r', encoding='utf-8') as f:
        bib_db = bibtexparser.load(f, parser=parser)

    return bib_db.entries


def bibtex_to_csl_json(entries: list) -> list:
    """
    将 BibTeX 条目转换为 CSL-JSON 格式

    Args:
        entries: BibTeX 条目列表

    Returns:
        CSL-JSON 格式的条目列表
    """
    csl_entries = []

    type_mapping = {
        'article': 'article-journal',
        'inproceedings': 'paper-conference',
        'conference': 'paper-conference',
        'book': 'book',
        'incollection': 'chapter',
        'phdthesis': 'thesis',
        'mastersthesis': 'thesis',
        'techreport': 'report',
        'misc': 'article',
        'unpublished': 'manuscript',
    }

    for entry in entries:
        csl = {
            'id': entry.get('ID', ''),
            'type': type_mapping.get(entry.get('ENTRYTYPE', '').lower(), 'article'),
        }

        # 标题
        if 'title' in entry:
            csl['title'] = entry['title'].strip('{}')

        # 作者
        if 'author' in entry:
            authors = []
            author_str = entry['author'].replace('\n', ' ')
            for author in author_str.split(' and '):
                author = author.strip()
                if ',' in author:
                    parts = author.split(',', 1)
                    authors.append({
                        'family': parts[0].strip(),
                        'given': parts[1].strip() if len(parts) > 1 else ''
                    })
                else:
                    parts = author.rsplit(' ', 1)
                    if len(parts) == 2:
                        authors.append({
                            'given': parts[0].strip(),
                            'family': parts[1].strip()
                        })
                    else:
                        authors.append({'family': author})
            csl['author'] = authors

        # 年份
        if 'year' in entry:
            csl['issued'] = {'date-parts': [[int(entry['year'])]]}

        # 期刊/会议
        if 'journal' in entry:
            csl['container-title'] = entry['journal']
        elif 'booktitle' in entry:
            csl['container-title'] = entry['booktitle']

        # 卷/期/页
        if 'volume' in entry:
            csl['volume'] = entry['volume']
        if 'number' in entry:
            csl['issue'] = entry['number']
        if 'pages' in entry:
            csl['page'] = entry['pages'].replace('--', '-')

        # DOI
        if 'doi' in entry:
            csl['DOI'] = entry['doi']

        # URL
        if 'url' in entry:
            csl['URL'] = entry['url']

        # 出版商
        if 'publisher' in entry:
            csl['publisher'] = entry['publisher']

        csl_entries.append(csl)

    return csl_entries


def format_bibliography(csl_entries: list, style: str = 'apa',
                       output_format: str = 'text') -> str:
    """
    使用 CSL 样式格式化参考文献

    Args:
        csl_entries: CSL-JSON 格式的条目列表
        style: CSL 样式名称 (apa, ieee, chicago-author-date, etc.)
        output_format: 输出格式 (text, html)

    Returns:
        格式化后的参考文献字符串
    """
    try:
        from citeproc import CitationStylesStyle, CitationStylesBibliography
        from citeproc import formatter
        from citeproc.source.json import CiteProcJSON
    except ImportError:
        raise RuntimeError("请安装 citeproc-py: pip install citeproc-py")

    try:
        from citeproc_styles import get_style_filepath
        style_path = get_style_filepath(style)
    except ImportError:
        # 尝试使用本地样式文件
        style_path = style if style.endswith('.csl') else f"{style}.csl"
        if not Path(style_path).exists():
            raise RuntimeError(
                f"样式 '{style}' 未找到。请安装 citeproc-py-styles: pip install citeproc-py-styles"
            )

    # 创建数据源
    bib_source = CiteProcJSON(csl_entries)

    # 加载样式
    bib_style = CitationStylesStyle(style_path, validate=False)

    # 选择输出格式
    if output_format == 'html':
        fmt = formatter.html
    else:
        fmt = formatter.plain

    # 创建参考文献对象
    bibliography = CitationStylesBibliography(bib_style, bib_source, fmt)

    # 注册所有条目
    for entry in csl_entries:
        bibliography.register(CitationItem(entry['id']))

    # 生成参考文献
    result = []
    for item in bibliography.bibliography():
        result.append(str(item))

    return '\n\n'.join(result)


class CitationItem:
    """引用项目包装类"""
    def __init__(self, key):
        self.key = key

    def __repr__(self):
        return f"CitationItem({self.key})"


def generate_citations_for_pandoc(bib_file: str, output_file: str):
    """
    生成 Pandoc 可用的 CSL-JSON 文件

    Args:
        bib_file: 输入 BibTeX 文件
        output_file: 输出 CSL-JSON 文件
    """
    entries = parse_bibtex(bib_file)
    csl_entries = bibtex_to_csl_json(entries)

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(csl_entries, f, ensure_ascii=False, indent=2)

    print(f"✓ 已生成: {output_file}")


def create_sample_bib(output_file: str):
    """创建示例 BibTeX 文件"""
    sample = """@article{zhang2024deep,
  title={Deep Learning for Natural Language Processing: A Survey},
  author={Zhang, San and Li, Si and Wang, Wu},
  journal={Journal of Machine Learning},
  volume={15},
  number={3},
  pages={100--150},
  year={2024},
  doi={10.1234/jml.2024.001}
}

@inproceedings{chen2023transformer,
  title={Transformer-based Models for Scientific Text Understanding},
  author={Chen, Liu and Zhao, Qi},
  booktitle={Proceedings of the International Conference on AI},
  pages={500--510},
  year={2023},
  publisher={ACM}
}

@book{bishop2006pattern,
  title={Pattern Recognition and Machine Learning},
  author={Bishop, Christopher M.},
  year={2006},
  publisher={Springer}
}

@phdthesis{wang2022thesis,
  title={基于深度学习的文本分类研究},
  author={王五},
  school={北京大学},
  year={2022}
}
"""
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(sample)
    print(f"✓ 已创建示例: {output_file}")


def main():
    parser = argparse.ArgumentParser(
        description='学术引用和参考文献管理工具',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
    python citation_demo.py references.bib
    python citation_demo.py references.bib --style ieee
    python citation_demo.py references.bib --format html -o refs.html
    python citation_demo.py references.bib --to-csl refs.json
    python citation_demo.py --create-sample sample.bib

常用样式:
    apa                       - APA 第7版
    ieee                      - IEEE
    chicago-author-date       - Chicago 著者-日期
    chicago-note-bibliography - Chicago 脚注
    harvard1                  - Harvard
    mla                       - MLA
    vancouver                 - Vancouver
    chinese-gb7714-2015-numeric - GB/T 7714-2015 顺序编码
        """
    )

    parser.add_argument('input', nargs='?', help='输入 BibTeX 文件')
    parser.add_argument('-s', '--style', default='apa',
                        help='CSL 样式名称（默认: apa）')
    parser.add_argument('-f', '--format', choices=['text', 'html'],
                        default='text', help='输出格式（默认: text）')
    parser.add_argument('-o', '--output', help='输出文件')
    parser.add_argument('--to-csl', metavar='FILE',
                        help='转换为 CSL-JSON 格式')
    parser.add_argument('--create-sample', metavar='FILE',
                        help='创建示例 BibTeX 文件')
    parser.add_argument('--list-entries', action='store_true',
                        help='列出 BibTeX 条目')

    args = parser.parse_args()

    # 创建示例
    if args.create_sample:
        create_sample_bib(args.create_sample)
        return

    # 需要输入文件的操作
    if not args.input:
        parser.print_help()
        sys.exit(1)

    if not Path(args.input).exists():
        print(f"错误: 文件不存在: {args.input}", file=sys.stderr)
        sys.exit(1)

    try:
        entries = parse_bibtex(args.input)
        print(f"已解析 {len(entries)} 条参考文献\n")

        # 列出条目
        if args.list_entries:
            for entry in entries:
                print(f"[{entry.get('ID', 'unknown')}] {entry.get('title', 'No title')[:60]}...")
            return

        # 转换为 CSL-JSON
        if args.to_csl:
            generate_citations_for_pandoc(args.input, args.to_csl)
            return

        # 格式化参考文献
        csl_entries = bibtex_to_csl_json(entries)
        result = format_bibliography(csl_entries, args.style, args.format)

        if args.output:
            with open(args.output, 'w', encoding='utf-8') as f:
                f.write(result)
            print(f"✓ 已保存到: {args.output}")
        else:
            print("=" * 60)
            print("参考文献列表")
            print("=" * 60)
            print(result)

    except Exception as e:
        print(f"错误: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
