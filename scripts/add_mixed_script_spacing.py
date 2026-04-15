#!/usr/bin/env python3
"""
在中日韩文与英文、数字混排处加空格（不修改其它 JSON 字段）。

规则（与常见「盘古」类排版一致）：
- 一段连续 CJK（汉字、日文假名、韩文音节）与一段连续 [A-Za-z0-9] 相邻时，中间插入一个空格；
- 已存在空格的不重复插入；多空格压成单空格（按行处理，保留换行）。

默认处理 data/from-iu、data/dear-iu、data/free 下所有 page-*.json 中帖子的文本字段：
  title_ko, title_zh, content_ko, content_zh，
  fan_comments[].content_ko / content_zh，
  iu_replies[].content_ko / content_zh。

用法:
  python3 scripts/add_mixed_script_spacing.py           # 直接写回文件
  python3 scripts/add_mixed_script_spacing.py --dry-run # 只统计将修改的条数与字符数
  python3 scripts/add_mixed_script_spacing.py --root /path/to/data/from-iu  # 只处理指定目录
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from typing import Any, Dict, List

# 与中文、日文、韩文音节相邻的拉丁字母 / 数字之间加空格（不含全角字母）
CJK_CHAR = r"\u4e00-\u9fff\u3400-\u4dbf\u3040-\u30ff\uac00-\ud7a3"
RE_CJK_THEN_LATIN = re.compile(rf"([{CJK_CHAR}]+)([A-Za-z0-9]+)")
RE_LATIN_THEN_CJK = re.compile(rf"([A-Za-z0-9]+)([{CJK_CHAR}]+)")


def add_mixed_script_spacing(text: str) -> str:
    if not text or not isinstance(text, str):
        return text
    s = RE_CJK_THEN_LATIN.sub(r"\1 \2", text)
    s = RE_LATIN_THEN_CJK.sub(r"\1 \2", s)
    lines = []
    for line in s.split("\n"):
        line = re.sub(r" +", " ", line)
        lines.append(line)
    return "\n".join(lines)


TEXT_KEYS_POST = ("title_ko", "title_zh", "content_ko", "content_zh")
TEXT_KEYS_COMMENT = ("content_ko", "content_zh")
TEXT_KEYS_REPLY = ("content_ko", "content_zh")


def process_string(val: str) -> tuple[str, bool]:
    new_val = add_mixed_script_spacing(val)
    return new_val, new_val != val


def process_post(post: Dict[str, Any], counter: List[int]) -> None:
    for k in TEXT_KEYS_POST:
        if k not in post or post[k] is None:
            continue
        if not isinstance(post[k], str):
            continue
        new_v, changed = process_string(post[k])
        if changed:
            counter[0] += 1
            post[k] = new_v
    comments = post.get("fan_comments") or []
    for c in comments:
        if not isinstance(c, dict):
            continue
        for k in TEXT_KEYS_COMMENT:
            if k not in c or c[k] is None or not isinstance(c[k], str):
                continue
            new_v, changed = process_string(c[k])
            if changed:
                counter[0] += 1
                c[k] = new_v
        for r in c.get("iu_replies") or []:
            if not isinstance(r, dict):
                continue
            for k in TEXT_KEYS_REPLY:
                if k not in r or r[k] is None or not isinstance(r[k], str):
                    continue
                new_v, changed = process_string(r[k])
                if changed:
                    counter[0] += 1
                    r[k] = new_v


def process_json_file(path: str, dry_run: bool) -> List[int]:
    """Returns [fields_changed, 1 if file changed else 0]."""
    with open(path, "r", encoding="utf-8") as f:
        doc = json.load(f)
    data = doc.get("data")
    if not isinstance(data, list):
        return [0, 0]
    counter = [0]
    original = json.dumps(doc, ensure_ascii=False, sort_keys=True)
    for post in data:
        if isinstance(post, dict):
            process_post(post, counter)
    new_json = json.dumps(doc, ensure_ascii=False, sort_keys=True)
    changed = original != new_json
    if changed and not dry_run:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(doc, f, ensure_ascii=False, indent=2)
            f.write("\n")
    return [counter[0], 1 if changed else 0]


def iter_page_json_files(root: str) -> List[str]:
    out = []
    if not os.path.isdir(root):
        return out
    for name in sorted(os.listdir(root)):
        if not name.startswith("page-") or not name.endswith(".json"):
            continue
        out.append(os.path.join(root, name))
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description="CJK 与英文/数字混排加空格")
    ap.add_argument(
        "--root",
        action="append",
        dest="roots",
        metavar="DIR",
        help="要处理的目录（可多次指定）。默认: data/from-iu, data/dear-iu, data/free",
    )
    ap.add_argument("--dry-run", action="store_true", help="只统计，不写文件")
    args = ap.parse_args()

    base = os.path.normpath(os.path.join(os.path.dirname(__file__), ".."))
    if args.roots:
        roots = [os.path.normpath(os.path.join(base, r) if not os.path.isabs(r) else r) for r in args.roots]
    else:
        roots = [
            os.path.join(base, "data", "from-iu"),
            os.path.join(base, "data", "dear-iu"),
            os.path.join(base, "data", "free"),
        ]

    total_fields = 0
    total_files = 0
    for root in roots:
        for path in iter_page_json_files(root):
            n_fields, n_file = process_json_file(path, args.dry_run)
            total_fields += n_fields
            total_files += n_file
            if n_file and args.dry_run:
                print(f"[dry-run] 将修改: {path}（{n_fields} 处字段）")
            elif n_file and not args.dry_run:
                print(f"已写入: {path}（{n_fields} 处字段）")

    mode = "（dry-run，未写文件）" if args.dry_run else ""
    print(f"完成{mode}: 共改动 {total_fields} 处文本字段，涉及 {total_files} 个 JSON 文件。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
