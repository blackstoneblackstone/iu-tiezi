# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IU Community (IU 回帖合集) - A bilingual (Chinese/Korean) static website displaying IU (아이유) fan community posts and interactions. The site renders IU's replies to fans across three board types: From IU (IU's own posts), Dear IU (fan posts to IU), and Free (general discussion).

## Key Commands

### 全部帖子时间线（纯 JSON）
首页「全部回帖」数据 = From IU 主帖（无评论串）+ Dear IU / Free 下每条 IU 回复（含补全的粉丝主帖）。编辑各板块 JSON 后运行：
```bash
python3 scripts/merge_timeline_json.py
```
仅需 Python 3 标准库（json / glob / os）。不依赖数据库。

### Data Export（可选，仅在有 SQLite 时）
```bash
python3 scripts/export_data.py
```
若仓库中不存在 `data/iu_data.db`，脚本会跳过并提示使用 `merge_timeline_json.py`。有库时：将数据库导出为 `data/` 下分页 JSON。

### Development
No build system required. Open HTML files directly in browser or serve locally:
```bash
python3 -m http.server 8000
```

## Architecture

### Data Flow
1. **JSON 工作流**：维护 `data/{from-iu,dear-iu,free}/page-*.json`；运行 `scripts/merge_timeline_json.py` 生成 `data/replies/`、`search-index.json`、`stats.json`。From IU 由 **from-iu JSON 全量展开**（主帖 + 粉丝评论及 IU 对评回复 + direct_iu_replies，时间线平铺）；Dear/Free 仍用 `replies` 内 IU 回复行并由脚本补全粉丝主帖。
2. **可选 DB 导出**：`scripts/export_data.py`（需 `data/iu_data.db`）可整库生成 `data/`。
3. **Frontend**: JavaScript fetches JSON files and renders content dynamically

### Frontend Structure
- **HTML pages**: 4 entry points - `index.html` (all replies), `from-iu.html`, `dear-iu.html`, `free.html`
- **JavaScript modules**: `js/common.js` provides shared utilities (translations, DataAPI, render functions), each page has its own module (`js/replies.js`, `js/from-iu.js`, etc.)
- **CSS**: Single stylesheet `css/style.css` with CSS variables for theme

### Data Files（`merge_timeline_json.py` / `export_data.py` 生成或维护）
- `stats.json` - summary statistics
- `fans.json` - fan list with reply counts
- `replies/page-{n}.json` - paginated IU replies (50 per page)
- `from-iu/page-{n}.json`, `dear-iu/page-{n}.json`, `free/page-{n}.json` - board-specific posts
- `search-index.json` - searchable content index

## Image Handling

Images use a remote domain `https://dearimage.iu101.org`. The `export_data.py` script prefixes relative paths with this domain via `add_domain_to_url()` function. Frontend prioritizes `local_image_paths` over `image_urls` when both exist.

## Language Support

The site supports Chinese (zh) and Korean (ko). Language preference is stored in localStorage. The `translations` object in `common.js` contains all UI strings. Content fields have both `_ko` and `_zh` suffixes (e.g., `content_ko`, `content_zh`).