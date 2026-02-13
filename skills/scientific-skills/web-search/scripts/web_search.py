#!/usr/bin/env python3
"""
Web Search — 通用网络搜索工具

通过 Jina AI (r.jina.ai) + Google 搜索实现零配置 web search。
无需 API key，仅依赖 Python 标准库。

用法:
    python web_search.py "搜索关键词"                  # 基本搜索
    python web_search.py "搜索关键词" --num 10         # 指定结果数
    python web_search.py "搜索关键词" --lang en        # 指定语言
    python web_search.py read "https://example.com"    # 读取网页内容
"""

import sys
import urllib.request
import urllib.parse
import urllib.error
import argparse
import re


JINA_READER_BASE = "https://r.jina.ai/"
GOOGLE_SEARCH_BASE = "https://www.google.com/search"
DEFAULT_NUM = 5
DEFAULT_LANG = "zh-CN"
REQUEST_TIMEOUT = 30


def fetch_url(url: str) -> str:
    """通过 Jina AI Reader 抓取 URL 并返回 Markdown 内容。"""
    jina_url = JINA_READER_BASE + url
    req = urllib.request.Request(
        jina_url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; WebSearchSkill/1.0)",
            "Accept": "text/plain",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
            return resp.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        return f"[错误] HTTP {e.code}: {e.reason}\nURL: {url}"
    except urllib.error.URLError as e:
        return f"[错误] 无法连接: {e.reason}\nURL: {url}"
    except Exception as e:
        return f"[错误] {type(e).__name__}: {e}\nURL: {url}"


def build_search_url(query: str, num: int = DEFAULT_NUM, lang: str = DEFAULT_LANG) -> str:
    """构造 Google 搜索 URL。"""
    params = urllib.parse.urlencode({
        "q": query,
        "num": num,
        "hl": lang,
    })
    return f"{GOOGLE_SEARCH_BASE}?{params}"


def extract_search_section(raw: str) -> str:
    """从原始 Markdown 中截取搜索结果区域（介于标题行和页脚之间）。"""
    # 搜索结果区域起始标记（中/英文）
    start_markers = ["搜索结果\n====", "Search Results\n===="]
    # 搜索结果区域结束标记
    end_markers = ["网页导航\n====", "Page Navigation\n====",
                   "People also search for", "相关搜索"]

    text = raw
    # 截取起始
    for m in start_markers:
        idx = text.find(m)
        if idx != -1:
            text = text[idx + len(m):]
            break

    # 截取结束
    best = len(text)
    for m in end_markers:
        idx = text.find(m)
        if idx != -1 and idx < best:
            best = idx
    text = text[:best]

    return text.strip()


def parse_results(section: str) -> list[dict]:
    """
    从搜索结果区域解析出结构化条目。

    每条 Google 搜索结果在 Jina Markdown 中的典型格式：
        [### Title ![Image N](...) Source https://...](actual_url)
        Source
        https://... › ...
        Date — Snippet text...
    """
    results = []

    # 匹配每条结果的入口：[### Title ... ](URL)
    # 标题内含 ![Image](...) 和来源域名，需要清理
    entry_pattern = re.compile(
        r'\[###\s+'        # 开头 [###
        r'(.+?)'           # 标题（贪婪最短匹配）
        r'\]\('            # ](
        r'(https?://[^\)]+)'  # URL
        r'\)',              # )
    )

    matches = list(entry_pattern.finditer(section))
    if not matches:
        return results

    for i, m in enumerate(matches):
        raw_title = m.group(1)
        url = m.group(2)

        # 清理标题：去掉 ![Image N](...) 和尾部的域名/路径面包屑
        title = re.sub(r'!\[Image[^\]]*\]\([^\)]*\)', '', raw_title).strip()
        # 去掉尾部残留的 URL 面包屑（如 "https://zhuanlan.zhihu.com › ..."）
        title = re.sub(r'\s*https?://\S+.*$', '', title).strip()
        # 去掉尾部残留的域名面包屑（如 "知乎专栏 › ..."、"OpenAI Help Center › articles ›"）
        title = re.sub(r'\s+\S+\s+›.*$', '', title).strip()
        # 去掉纯粹的 blob: 引用残余
        title = re.sub(r'\s*blob:\S+', '', title).strip()

        # 提取摘要：从当前匹配结束到下一个匹配开始之间的文本
        snippet_start = m.end()
        snippet_end = matches[i + 1].start() if i + 1 < len(matches) else len(section)
        between = section[snippet_start:snippet_end].strip()

        # 从中间文本提取摘要
        snippet_lines = []
        for line in between.split('\n'):
            line = line.strip()
            if not line:
                continue
            # 跳过纯 URL 面包屑行（如 "https://... › ..."）
            if re.match(r'^https?://\S+', line):
                continue
            # 跳过纯来源名行（通常很短且不含标点）
            if len(line) < 15 and '—' not in line and '...' not in line and '。' not in line:
                continue
            # 跳过子链接列表（如 "* [GPT-5](url)"）
            if line.startswith('*'):
                continue
            # 跳过内嵌的视频/图片卡片链接（如 "[OpenAI's New GPT ... YouTube · ..."）
            if re.match(r'^\[.*(?:YouTube|视频).*\]\(', line):
                continue
            # 跳过 [Read more] 链接
            line = re.sub(r'\[Read more\]\([^\)]*\)', '', line).strip()
            # 去掉 Markdown 强调标记
            line = line.replace('_', '')
            # 去掉内嵌的图片引用 ![Image N]  或 !Image N
            line = re.sub(r'!\[Image\s*\d*\](\([^\)]*\))?', '', line)
            line = re.sub(r'!Image\s*\d+', '', line)
            # 去掉内嵌 markdown 链接，只保留文本
            line = re.sub(r'\[([^\]]*)\]\([^\)]*\)', r'\1', line).strip()
            # 去掉连续多余空格
            line = re.sub(r'\s{2,}', ' ', line).strip()
            if line:
                snippet_lines.append(line)

        # 去掉摘要开头可能残留的来源名（与标题末尾重复的短文本）
        if snippet_lines and len(snippet_lines[0]) < 30:
            first = snippet_lines[0]
            # 来源名特征：短、无日期、无标点
            has_date = bool(re.search(r'\d{4}', first))
            has_punct = bool(re.search(r'[。，、；：！？.,:;!?—]', first))
            if not has_date and not has_punct:
                snippet_lines = snippet_lines[1:]

        snippet = ' '.join(snippet_lines).strip()
        # 截断过长的摘要
        if len(snippet) > 300:
            snippet = snippet[:297] + '...'

        results.append({
            'title': title,
            'url': url,
            'snippet': snippet,
        })

    return results


def format_results(results: list[dict], query: str) -> str:
    """将结构化结果格式化为易读的输出。"""
    if not results:
        return f"未找到与 \"{query}\" 相关的搜索结果。请尝试其他关键词。"

    lines = []
    for i, r in enumerate(results, 1):
        lines.append(f"[{i}] {r['title']}")
        lines.append(f"    链接: {r['url']}")
        if r['snippet']:
            lines.append(f"    摘要: {r['snippet']}")
        lines.append("")

    lines.append(f"共 {len(results)} 条结果。")
    lines.append("提示: 使用 `python web_search.py read <URL>` 可查看某条结果的完整网页内容。")
    return '\n'.join(lines)


def clean_search_results(raw: str, query: str) -> str:
    """从原始 Jina Markdown 中提取并格式化搜索结果。"""
    section = extract_search_section(raw)
    if not section:
        # 回退：返回去除明显噪音后的原文
        return raw

    results = parse_results(section)
    if not results:
        return raw

    return format_results(results, query)


def search(query: str, num: int = DEFAULT_NUM, lang: str = DEFAULT_LANG) -> None:
    """执行搜索并输出结果。"""
    print(f"🔍 搜索: {query}")
    print(f"   语言: {lang} | 结果数: {num}")
    print("-" * 60)

    url = build_search_url(query, num, lang)
    raw = fetch_url(url)

    if raw.startswith("[错误]"):
        print(raw)
        sys.exit(1)

    result = clean_search_results(raw, query)
    print(result)


def read_page(url: str) -> None:
    """读取并输出指定网页的 Markdown 内容。"""
    print(f"📄 读取网页: {url}")
    print("-" * 60)

    content = fetch_url(url)

    if content.startswith("[错误]"):
        print(content)
        sys.exit(1)

    print(content)


def main():
    parser = argparse.ArgumentParser(
        description="Web Search — 通用网络搜索工具",
        usage="%(prog)s [-h] {query,read} ...",
    )
    subparsers = parser.add_subparsers(dest="command")

    # read 子命令
    read_parser = subparsers.add_parser("read", help="读取指定网页内容")
    read_parser.add_argument("url", help="要读取的网页 URL")

    # 如果第一个参数不是 "read"，则视为搜索查询
    # 解析参数时需要处理这种情况
    if len(sys.argv) < 2:
        parser.print_help()
        sys.exit(1)

    # 检查是否是 read 子命令
    if sys.argv[1] == "read":
        args = parser.parse_args()
        read_page(args.url)
    else:
        # 搜索模式：第一个位置参数是查询词
        search_parser = argparse.ArgumentParser(
            description="Web Search — 通用网络搜索工具"
        )
        search_parser.add_argument("query", help="搜索关键词")
        search_parser.add_argument(
            "--num",
            type=int,
            default=DEFAULT_NUM,
            help=f"返回结果数量（默认 {DEFAULT_NUM}）",
        )
        search_parser.add_argument(
            "--lang",
            default=DEFAULT_LANG,
            help=f"搜索语言（默认 {DEFAULT_LANG}）",
        )
        args = search_parser.parse_args()
        search(args.query, args.num, args.lang)


if __name__ == "__main__":
    main()
