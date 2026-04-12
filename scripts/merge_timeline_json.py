#!/usr/bin/env python3
"""
纯 JSON：维护「全部帖子」时间线（data/replies + search-index + stats）。

规则（与产品一致）：
- 全部帖子 = From IU + Dear IU + Free 的合集时间线（按时间平铺，无父子嵌套数据依赖）。
- From IU：从 from-iu JSON 生成「IU 主帖」+「每条粉丝评论（及 IU 对评回复）」+「direct_iu_replies」；
  不再使用 replies 里旧的 From IU 导出行（避免缺条或与 JSON 不一致）。
- Dear IU / Free：保留 replies 中的 IU 回复行，并用 dear-iu/free JSON 补全粉丝主帖。

改完任意板块 JSON 后运行本脚本即可同步；仅更新了 from-iu 时同样运行即可把新帖并进时间线。
"""

import glob
import json
import os
import re
from datetime import datetime

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
DATA_DIR = os.path.normpath(DATA_DIR)
REPLIES_PAGE_SIZE = 50


def merge_post_title_into_timeline_content(title_ko, title_zh, body_ko, body_zh):
    def one(title, body):
        t = (title or "").strip()
        b = (body or "").strip()
        if t and b:
            return f"{t}\n\n{b}"
        return t or b or ""

    return one(title_ko, body_ko), one(title_zh, body_zh)


def _page_paths(subdir):
    pattern = os.path.join(DATA_DIR, subdir, "page-*.json")
    paths = glob.glob(pattern)

    def sort_key(p):
        m = re.search(r"page-(\d+)\.json$", p)
        return int(m.group(1)) if m else 0

    return sorted(paths, key=sort_key)


def load_all_posts_by_id():
    """from-iu / dear-iu / free 全部帖子，按 id 索引（用于补全回帖上下文）。"""
    by_id = {}
    for folder in ("from-iu", "dear-iu", "free"):
        for path in _page_paths(folder):
            with open(path, "r", encoding="utf-8") as f:
                doc = json.load(f)
            for p in doc.get("data") or []:
                by_id[int(p["id"])] = p
    return by_id


def load_all_from_iu_posts(posts_by_id):
    """仅 From IU 板块帖子（用于合成时间线条目）。"""
    return [p for p in posts_by_id.values() if (p.get("board") or "") == "From. IU"]


def from_iu_post_ids(posts_by_id):
    """From IU 主帖 id 集合。"""
    return {
        int(p["id"])
        for p in posts_by_id.values()
        if (p.get("board") or "") == "From. IU"
    }


def strip_exported_from_iu_rows(replies, fi_ids):
    """去掉 replies 里历史导出的 From IU 行，改由 from-iu JSON 全量展开。"""
    out = []
    for r in replies:
        if (r.get("board") or "") != "From. IU":
            out.append(r)
            continue
        pid = r.get("post_id")
        if pid is None:
            out.append(r)
            continue
        try:
            ip = int(pid)
        except (TypeError, ValueError):
            out.append(r)
            continue
        if ip in fi_ids:
            continue
        out.append(r)
    return out


def _norm(s):
    return (s or "").strip()


def _post_shell_fields(post):
    pid = int(post["id"])
    return {
        "post_id": pid,
        "post_title_ko": post.get("title_ko"),
        "post_title_zh": post.get("title_zh"),
        "post_time": post.get("post_time"),
        "post_image_count": post.get("image_count"),
        "post_image_urls": post.get("image_urls"),
        "post_local_image_paths": post.get("local_image_paths"),
        "board": "From. IU",
    }


def build_from_iu_comment_reply_row(post, comment, iu_reply, idx):
    pid = int(post["id"])
    cid = int(comment["id"])
    nid = -(pid * 1_000_000 + cid * 1000 + idx)
    pu = post.get("post_uuid") or str(pid)
    base = _post_shell_fields(post)
    base.update(
        {
            "id": nid,
            "reply_uuid": f"{pu}-c{cid}-iu-{iu_reply.get('id', idx)}",
            "content_ko": iu_reply.get("content_ko"),
            "content_zh": iu_reply.get("content_zh"),
            "replied_at": iu_reply.get("replied_at"),
            "image_count": iu_reply.get("image_count"),
            "image_urls": iu_reply.get("image_urls"),
            "iu_local_image_paths": iu_reply.get("local_image_paths"),
            "is_reply_to_comment": 1,
            "reply_to_username": comment.get("fan_username"),
            "fan_comment_ko": comment.get("content_ko"),
            "fan_comment_zh": comment.get("content_zh"),
            "fan_image_count": comment.get("image_count"),
            "fan_image_urls": comment.get("image_urls"),
            "fan_local_image_paths": comment.get("local_image_paths"),
            "fan_username": comment.get("fan_username"),
            "fan_avatar": comment.get("fan_avatar") or None,
            "fan_local_avatar": comment.get("fan_local_avatar"),
        }
    )
    return base


def build_fan_comment_only_row(post, comment):
    """粉丝评论尚无 IU 回复时仍进时间线（IU 侧为空）。"""
    pid = int(post["id"])
    cid = int(comment["id"])
    nid = -(pid * 1_000_000 + cid * 1000 + 998)
    pu = post.get("post_uuid") or str(pid)
    base = _post_shell_fields(post)
    base.update(
        {
            "id": nid,
            "reply_uuid": f"{pu}-c{cid}-fanonly",
            "content_ko": "",
            "content_zh": "",
            "replied_at": comment.get("commented_at"),
            "image_count": 0,
            "image_urls": None,
            "iu_local_image_paths": None,
            "is_reply_to_comment": 1,
            "reply_to_username": comment.get("fan_username"),
            "fan_comment_ko": comment.get("content_ko"),
            "fan_comment_zh": comment.get("content_zh"),
            "fan_image_count": comment.get("image_count"),
            "fan_image_urls": comment.get("image_urls"),
            "fan_local_image_paths": comment.get("local_image_paths"),
            "fan_username": comment.get("fan_username"),
            "fan_avatar": comment.get("fan_avatar") or None,
            "fan_local_avatar": comment.get("fan_local_avatar"),
        }
    )
    return base


def build_direct_iu_row(post, dr, idx):
    """帖内 direct_iu_replies（对帖的 IU 追加层等）。"""
    pid = int(post["id"])
    nid = -(pid * 1_000_000 + 500_000 + idx)
    pu = post.get("post_uuid") or str(pid)
    base = _post_shell_fields(post)
    base.update(
        {
            "id": nid,
            "reply_uuid": f"{pu}-direct-{dr.get('id', idx)}",
            "content_ko": dr.get("content_ko"),
            "content_zh": dr.get("content_zh"),
            "replied_at": dr.get("replied_at"),
            "image_count": dr.get("image_count"),
            "image_urls": dr.get("image_urls"),
            "iu_local_image_paths": dr.get("local_image_paths"),
            "is_reply_to_comment": 0,
            "reply_to_username": None,
            "fan_comment_ko": None,
            "fan_comment_zh": None,
            "fan_image_count": None,
            "fan_image_urls": None,
            "fan_local_image_paths": None,
            "fan_username": None,
            "fan_avatar": None,
            "fan_local_avatar": None,
        }
    )
    return base


def flatten_from_iu_post(post):
    """单条 From IU 主帖 → 时间线条目列表（主帖 + 评回复链 + direct）。"""
    opener = post_to_synthetic_reply(post)
    rows = [opener]
    op_ko, op_zh = opener.get("content_ko"), opener.get("content_zh")

    for comment in post.get("fan_comments") or []:
        iu_replies = comment.get("iu_replies") or []
        if iu_replies:
            for idx, ir in enumerate(iu_replies):
                rows.append(build_from_iu_comment_reply_row(post, comment, ir, idx))
        else:
            rows.append(build_fan_comment_only_row(post, comment))

    for idx, dr in enumerate(post.get("direct_iu_replies") or []):
        if idx == 0:
            if _norm(dr.get("content_ko")) == _norm(post.get("content_ko")) and _norm(
                dr.get("content_zh")
            ) == _norm(post.get("content_zh")) and dr.get("replied_at") == post.get(
                "post_time"
            ):
                continue
            if _norm(dr.get("content_ko")) == _norm(op_ko) and _norm(
                dr.get("content_zh")
            ) == _norm(op_zh):
                continue
        rows.append(build_direct_iu_row(post, dr, idx))

    return rows


def load_reply_items_strip_synthetic():
    """只保留 id > 0 的条目，避免重复合并历史中的合成项。"""
    items = []
    for path in _page_paths("replies"):
        with open(path, "r", encoding="utf-8") as f:
            doc = json.load(f)
        for row in doc.get("data") or []:
            rid = row.get("id")
            if isinstance(rid, int) and rid > 0:
                items.append(row)
    return items


def enrich_reply_with_post_context(reply, posts_by_id):
    """
    Dear IU / Free 等：主帖在 posts JSON 里，iu_replies 导出行往往没有 fan_comment / fan_username。
    把帖子正文与图片填回，首页卡片才能显示完整粉丝来信 + IU 回复。
    """
    pid = reply.get("post_id")
    if pid is None:
        return
    try:
        pid = int(pid)
    except (TypeError, ValueError):
        return
    post = posts_by_id.get(pid)
    if not post:
        return

    board = post.get("board") or ""
    if board not in ("Dear. IU", "Free"):
        return

    has_comment = bool(
        (reply.get("fan_comment_ko") or "").strip()
        or (reply.get("fan_comment_zh") or "").strip()
    )
    if not has_comment:
        ck, cz = merge_post_title_into_timeline_content(
            post.get("title_ko"),
            post.get("title_zh"),
            post.get("content_ko"),
            post.get("content_zh"),
        )
        reply["fan_comment_ko"] = ck or None
        reply["fan_comment_zh"] = cz or None

    if not reply.get("fan_username"):
        reply["fan_username"] = post.get("author_username")

    if not reply.get("fan_avatar"):
        reply["fan_avatar"] = post.get("author_avatar")
    if not reply.get("fan_local_avatar"):
        reply["fan_local_avatar"] = post.get("author_local_avatar") or post.get(
            "author_avatar"
        )

    has_fan_img = bool(
        (reply.get("fan_image_urls") or "").strip()
        or (reply.get("fan_local_image_paths") or "").strip()
    )
    if not has_fan_img and (post.get("image_count") or 0) > 0:
        reply["fan_image_count"] = post.get("image_count")
        reply["fan_image_urls"] = post.get("image_urls")
        reply["fan_local_image_paths"] = post.get("local_image_paths")


def post_to_synthetic_reply(post):
    ck, cz = merge_post_title_into_timeline_content(
        post.get("title_ko"),
        post.get("title_zh"),
        post.get("content_ko"),
        post.get("content_zh"),
    )
    pid = int(post["id"])
    return {
        "id": -pid,
        "reply_uuid": post.get("post_uuid") or f"fromiu-post-{pid}",
        "content_ko": ck,
        "content_zh": cz,
        "replied_at": post.get("post_time"),
        "board": post.get("board") or "From. IU",
        "image_count": post.get("image_count"),
        "image_urls": post.get("image_urls"),
        "iu_local_image_paths": post.get("local_image_paths"),
        "is_reply_to_comment": 0,
        "reply_to_username": None,
        "post_id": pid,
        "post_title_ko": post.get("title_ko"),
        "post_title_zh": post.get("title_zh"),
        "post_time": post.get("post_time"),
        "post_image_count": post.get("image_count"),
        "post_image_urls": post.get("image_urls"),
        "post_local_image_paths": post.get("local_image_paths"),
        "fan_comment_ko": None,
        "fan_comment_zh": None,
        "fan_image_count": None,
        "fan_image_urls": None,
        "fan_local_image_paths": None,
        "fan_username": None,
        "fan_avatar": None,
        "fan_local_avatar": None,
    }


def write_replies_pages(merged):
    page_size = REPLIES_PAGE_SIZE
    n = len(merged)
    if n == 0:
        total_pages = 1
        slices = [(1, [])]
    else:
        total_pages = (n + page_size - 1) // page_size
        slices = []
        for page in range(1, total_pages + 1):
            start = (page - 1) * page_size
            slices.append((page, merged[start : start + page_size]))

    out_dir = os.path.join(DATA_DIR, "replies")
    os.makedirs(out_dir, exist_ok=True)
    for page, page_data in slices:
        doc = {
            "page": page,
            "totalPages": total_pages,
            "total": n,
            "data": page_data,
        }
        path = os.path.join(out_dir, f"page-{page}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(doc, f, ensure_ascii=False, indent=2)

    # 删除可能多余的旧页（合并后总页数变少）
    for path in glob.glob(os.path.join(out_dir, "page-*.json")):
        m = re.search(r"page-(\d+)\.json$", path)
        if m and int(m.group(1)) > total_pages:
            os.remove(path)


def write_search_index(merged):
    index = []
    for idx, row in enumerate(merged):
        page = idx // REPLIES_PAGE_SIZE + 1
        index.append(
            {
                "id": row["id"],
                "content_ko": row.get("content_ko"),
                "content_zh": row.get("content_zh"),
                "fan_username": row.get("reply_to_username"),
                "image_count": row.get("image_count") or 0,
                "fan_image_count": row.get("fan_image_count") or 0,
                "fan_comment_ko": row.get("fan_comment_ko"),
                "fan_comment_zh": row.get("fan_comment_zh"),
                "page": page,
            }
        )
    path = os.path.join(DATA_DIR, "search-index.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump({"total": len(index), "index": index}, f, ensure_ascii=False, indent=2)


def patch_stats(merged):
    stats_path = os.path.join(DATA_DIR, "stats.json")
    prev = {}
    if os.path.isfile(stats_path):
        with open(stats_path, "r", encoding="utf-8") as f:
            prev = json.load(f)

    times = [r.get("replied_at") or "" for r in merged if r.get("replied_at")]
    last_active = max(times) if times else prev.get("lastActive")

    prev["totalReplies"] = len(merged)
    prev["lastActive"] = last_active
    prev["exportedAt"] = datetime.now().isoformat()

    with open(stats_path, "w", encoding="utf-8") as f:
        json.dump(prev, f, ensure_ascii=False, indent=2)


def main():
    posts_by_id = load_all_posts_by_id()
    fi_ids = from_iu_post_ids(posts_by_id)

    replies = load_reply_items_strip_synthetic()
    raw = len(replies)
    replies = strip_exported_from_iu_rows(replies, fi_ids)
    stripped = raw - len(replies)

    for r in replies:
        enrich_reply_with_post_context(r, posts_by_id)

    from_iu_posts = load_all_from_iu_posts(posts_by_id)
    from_iu_flat = []
    for p in from_iu_posts:
        from_iu_flat.extend(flatten_from_iu_post(p))

    merged = replies + from_iu_flat
    merged.sort(key=lambda r: r.get("replied_at") or "", reverse=True)

    write_replies_pages(merged)
    write_search_index(merged)
    patch_stats(merged)

    print(
        f"✓ merge_timeline_json: Dear/Free 等保留 {len(replies)} 条"
        f"（去掉 replies 内旧 From IU 行 {stripped} 条）"
        f"，from-iu JSON 展开 {len(from_iu_flat)} 条 → 共 {len(merged)} 条「全部帖子」"
    )


if __name__ == "__main__":
    main()
