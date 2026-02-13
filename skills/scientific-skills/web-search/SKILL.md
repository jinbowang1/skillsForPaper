---
name: web-search
description: 通用网络搜索工具。用于查询非学术性信息：产品发布、行业新闻、技术评测、时事热点、公司动态等。使用 Jina AI 实现零配置搜索，无需 API key。
allowed-tools: [Read, Write, Edit, Bash]
license: MIT license
metadata:
  skill-author: 大师兄团队
---

# Web Search — 通用网络搜索

## Overview

通用网络搜索技能，通过 Jina AI (`r.jina.ai`) + Google 搜索实现零配置 web search。无需 API key，仅依赖 Python 标准库。适用于查询非学术性信息，如产品发布、行业新闻、技术评测、时事热点、公司动态等。

## When to Use

使用此技能查询**非学术性信息**：

- **产品发布**："最新发布的大模型"、"GPT-5 什么时候发布"
- **行业新闻**："AI 行业最近有什么大事"、"OpenAI 最新动态"
- **技术评测**："Claude vs GPT-4o 对比评测"、"最好用的代码编辑器"
- **时事热点**："2024 诺贝尔奖获得者"、"最近的科技大会"
- **公司动态**："Google DeepMind 最近在做什么"
- **工具对比**："Python vs Rust 性能对比"
- **价格与可用性**："Claude API 定价"、"AWS GPU 实例价格"

## When NOT to Use

以下场景应使用 `research-lookup` 技能：

- 学术文献搜索（"帮我找深度学习相关论文"）
- 论文引用查找（"transformer 的开创性论文"）
- 期刊文章检索（"Nature 2024 发表了哪些关于 CRISPR 的文章"）
- 需要 DOI、引用格式等学术元数据的查询

**判断依据**：
- 关键词含"论文""文献""研究""期刊""引用" → 使用 `research-lookup`
- 关键词含"发布""产品""新闻""评测""公司""价格""上线" → 使用本技能
- 不确定 → 优先使用本技能（覆盖面更广），必要时补充学术查询

## How to Use

### 基本搜索

使用 Bash 工具调用搜索脚本：

```bash
python skills/scientific-skills/web-search/scripts/web_search.py "搜索关键词"
```

### 参数选项

```bash
# 指定返回结果数量（默认 5）
python skills/scientific-skills/web-search/scripts/web_search.py "搜索关键词" --num 10

# 指定搜索语言（默认 zh-CN）
python skills/scientific-skills/web-search/scripts/web_search.py "search query" --lang en

# 深入阅读某个网页的完整内容
python skills/scientific-skills/web-search/scripts/web_search.py read "https://example.com/article"
```

### 搜索示例

```bash
# 查产品发布
python skills/scientific-skills/web-search/scripts/web_search.py "2024最新发布的大模型"

# 查行业新闻
python skills/scientific-skills/web-search/scripts/web_search.py "OpenAI GPT-5 release date" --lang en

# 查技术评测
python skills/scientific-skills/web-search/scripts/web_search.py "Claude 3.5 vs GPT-4o benchmark comparison" --lang en

# 深入阅读某篇文章
python skills/scientific-skills/web-search/scripts/web_search.py read "https://example.com/some-article"
```

## 结果处理指引

### 从搜索结果中提取信息

1. **阅读搜索结果摘要**：脚本会返回格式化的搜索结果，包含标题、URL 和摘要
2. **提取关键信息**：从摘要中提取与用户查询相关的核心信息
3. **综合多条结果**：将多条搜索结果中的信息综合整理，给出完整回答

### 深入阅读

当搜索结果摘要不够详细时，使用 `read` 子命令获取完整网页内容：

```bash
python skills/scientific-skills/web-search/scripts/web_search.py read "https://specific-article-url.com"
```

### 回复格式建议

向用户回复时：
- 综合多个来源的信息，不要逐条翻译搜索结果
- 标注信息来源（提供链接）
- 注明搜索时间，提醒用户信息可能随时间变化
- 如果搜索结果不充分，如实告知并建议更精确的搜索词

## 技术实现

- **搜索引擎**：Google Search（通过 URL 构造）
- **网页抓取**：Jina AI Reader (`r.jina.ai`) — 免费，无需 API key，将网页转为 Markdown
- **依赖**：仅 Python 标准库（`urllib`），无需 `pip install`
- **原理**：`https://r.jina.ai/https://www.google.com/search?q=<query>` 返回 Google 搜索结果的 Markdown 格式

## Limitations

- Jina AI 免费版有速率限制，高频使用可能被暂时限流
- 部分网站可能阻止 Jina AI 抓取
- 搜索结果质量取决于 Google 搜索排名
- 不适合需要登录才能访问的内容
