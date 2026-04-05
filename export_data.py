#!/usr/bin/env python3
"""
导出 IU 数据库为前端需要的 JSON 文件
"""

import sqlite3
import json
import os
from datetime import datetime

DB_PATH = 'data/iu_data.db'
DATA_DIR = 'data'
IMAGE_DOMAIN = 'https://dearimage.iu101.org'

def add_domain_to_url(url):
    """为相对路径的图片 URL 添加域名"""
    if not url:
        return url
    if url.startswith('http://') or url.startswith('https://'):
        return url
    if url.startswith('/'):
        return f"{IMAGE_DOMAIN}{url}"
    return f"{IMAGE_DOMAIN}/{url}"

def process_image_urls(urls_str):
    """处理图片 URL 字符串，为每个路径添加域名"""
    if not urls_str:
        return urls_str
    urls = [u.strip() for u in urls_str.split('|') if u.strip()]
    urls_with_domain = [add_domain_to_url(u) for u in urls]
    return '|'.join(urls_with_domain)

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def export_stats():
    """导出统计数据"""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 获取总回复数
    cursor.execute("SELECT COUNT(*) FROM iu_replies")
    total_replies = cursor.fetchone()[0]

    # 获取总粉丝数（非 IU 用户）
    cursor.execute("SELECT COUNT(*) FROM users WHERE is_iu = 0")
    total_fans = cursor.fetchone()[0]

    # 获取最后活跃时间
    cursor.execute("SELECT MAX(replied_at) FROM iu_replies")
    last_active = cursor.fetchone()[0]

    # 获取 IU 信息
    cursor.execute("SELECT * FROM users WHERE is_iu = 1 LIMIT 1")
    iu_user = cursor.fetchone()

    stats = {
        "totalReplies": total_replies,
        "totalFans": total_fans,
        "lastActive": last_active,
        "iuAvatar": add_domain_to_url(iu_user['avatar_url']) if iu_user else None,
        "iuLocalAvatar": add_domain_to_url(iu_user['local_avatar_path']) if iu_user else None,
        "exportedAt": datetime.now().isoformat()
    }

    with open(f'{DATA_DIR}/stats.json', 'w', encoding='utf-8') as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)

    print(f"✓ Exported stats.json: {total_replies} replies, {total_fans} fans")
    conn.close()

def export_fans():
    """导出粉丝列表"""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 获取粉丝及其回复数
    cursor.execute("""
        SELECT u.username, u.avatar_url, u.local_avatar_path, COUNT(ir.id) as reply_count
        FROM users u
        LEFT JOIN iu_replies ir ON u.username = ir.reply_to_username
        WHERE u.is_iu = 0
        GROUP BY u.id
        HAVING reply_count > 0
        ORDER BY reply_count DESC
    """)

    fans = []
    for row in cursor.fetchall():
        fans.append({
            "username": row['username'],
            "avatar_url": add_domain_to_url(row['avatar_url']),
            "local_avatar_path": add_domain_to_url(row['local_avatar_path']),
            "reply_count": row['reply_count']
        })

    with open(f'{DATA_DIR}/fans.json', 'w', encoding='utf-8') as f:
        json.dump(fans, f, ensure_ascii=False, indent=2)

    print(f"✓ Exported fans.json: {len(fans)} fans")
    conn.close()

def export_replies():
    """导出回帖数据，按页分割"""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 获取所有回复，关联相关表
    cursor.execute("""
        SELECT
            ir.id,
            ir.reply_uuid,
            ir.content_ko,
            ir.content_zh,
            ir.replied_at,
            ir.board,
            ir.image_count as image_count,
            ir.image_urls,
            ir.local_image_paths as iu_local_image_paths,
            ir.is_reply_to_comment,
            ir.reply_to_username,
            p.id as post_id,
            p.title_ko as post_title_ko,
            p.title_zh as post_title_zh,
            p.post_time,
            p.image_count as post_image_count,
            p.image_urls as post_image_urls,
            p.local_image_paths as post_local_image_paths,
            fc.content_ko as fan_comment_ko,
            fc.content_zh as fan_comment_zh,
            fc.image_count as fan_image_count,
            fc.image_urls as fan_image_urls,
            fc.local_image_paths as fan_local_image_paths,
            u.username as fan_username,
            u.avatar_url as fan_avatar,
            u.local_avatar_path as fan_local_avatar
        FROM iu_replies ir
        LEFT JOIN posts p ON ir.post_id = p.id
        LEFT JOIN fan_comments fc ON ir.reply_to_fan_comment_id = fc.id
        LEFT JOIN users u ON fc.fan_id = u.id
        ORDER BY ir.replied_at DESC
    """)

    replies = []
    for row in cursor.fetchall():
        reply = {
            "id": row['id'],
            "reply_uuid": row['reply_uuid'],
            "content_ko": row['content_ko'],
            "content_zh": row['content_zh'],
            "replied_at": row['replied_at'],
            "board": row['board'],
            "image_count": row['image_count'],
            "image_urls": process_image_urls(row['image_urls']),
            "iu_local_image_paths": process_image_urls(row['iu_local_image_paths']),
            "is_reply_to_comment": row['is_reply_to_comment'],
            "reply_to_username": row['reply_to_username'],
            "post_id": row['post_id'],
            "post_title_ko": row['post_title_ko'],
            "post_title_zh": row['post_title_zh'],
            "post_time": row['post_time'],
            "post_image_count": row['post_image_count'],
            "post_image_urls": process_image_urls(row['post_image_urls']),
            "post_local_image_paths": process_image_urls(row['post_local_image_paths']),
            "fan_comment_ko": row['fan_comment_ko'],
            "fan_comment_zh": row['fan_comment_zh'],
            "fan_image_count": row['fan_image_count'],
            "fan_image_urls": process_image_urls(row['fan_image_urls']),
            "fan_local_image_paths": process_image_urls(row['fan_local_image_paths']),
            "fan_username": row['fan_username'],
            "fan_avatar": add_domain_to_url(row['fan_avatar']),
            "fan_local_avatar": add_domain_to_url(row['fan_local_avatar'])
        }
        replies.append(reply)

    # 分页导出，每页 50 条
    page_size = 50
    total_pages = (len(replies) + page_size - 1) // page_size

    for page in range(1, total_pages + 1):
        start = (page - 1) * page_size
        end = start + page_size
        page_data = replies[start:end]

        output = {
            "page": page,
            "totalPages": total_pages,
            "total": len(replies),
            "data": page_data
        }

        with open(f'{DATA_DIR}/replies/page-{page}.json', 'w', encoding='utf-8') as f:
            json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"✓ Exported {total_pages} pages to replies/ ({len(replies)} total)")
    conn.close()
    return replies

def export_board_posts(board_name, folder_name):
    """导出特定板块的帖子数据（包含评论和IU回复）"""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 获取 IU 用户信息
    cursor.execute("SELECT id FROM users WHERE is_iu = 1 LIMIT 1")
    iu_user = cursor.fetchone()
    iu_user_id = iu_user['id'] if iu_user else None

    # 根据板块确定查询条件
    if board_name == 'From. IU':
        # From IU: IU 发的帖子
        where_clause = "p.author_id = ?"
        params = (iu_user_id,)
    else:
        # Dear IU / Free: 对应板块的粉丝帖子
        where_clause = "p.board = ?"
        params = (board_name,)

    # 获取帖子列表
    cursor.execute(f"""
        SELECT
            p.id,
            p.post_uuid,
            p.title_ko,
            p.title_zh,
            p.content_ko,
            p.content_zh,
            p.post_time,
            p.image_count,
            p.image_urls,
            p.local_image_paths,
            p.likes,
            p.comments,
            p.views,
            p.board,
            p.members_only,
            u.username as author_username,
            u.avatar_url as author_avatar,
            u.local_avatar_path as author_local_avatar
        FROM posts p
        LEFT JOIN users u ON p.author_id = u.id
        WHERE {where_clause}
        ORDER BY p.post_time DESC
    """, params)

    posts = []
    for row in cursor.fetchall():
        post = {
            "id": row['id'],
            "post_uuid": row['post_uuid'],
            "title_ko": row['title_ko'],
            "title_zh": row['title_zh'],
            "content_ko": row['content_ko'],
            "content_zh": row['content_zh'],
            "post_time": row['post_time'],
            "image_count": row['image_count'],
            "image_urls": process_image_urls(row['image_urls']),
            "local_image_paths": process_image_urls(row['local_image_paths']),
            "likes": row['likes'],
            "comments": row['comments'],
            "views": row['views'],
            "board": row['board'],
            "members_only": row['members_only'],
            "author_username": row['author_username'],
            "author_avatar": add_domain_to_url(row['author_avatar']),
            "author_local_avatar": add_domain_to_url(row['author_local_avatar']),
            "fan_comments": [],
            "direct_iu_replies": []
        }

        # 获取该帖子的粉丝评论
        cursor.execute("""
            SELECT
                fc.id,
                fc.content_ko,
                fc.content_zh,
                fc.image_count,
                fc.image_urls,
                fc.local_image_paths,
                fc.commented_at,
                u.username as fan_username,
                u.avatar_url as fan_avatar,
                u.local_avatar_path as fan_local_avatar
            FROM fan_comments fc
            LEFT JOIN users u ON fc.fan_id = u.id
            WHERE fc.post_id = ?
            ORDER BY fc.commented_at ASC
        """, (row['id'],))

        for c_row in cursor.fetchall():
            comment = {
                "id": c_row['id'],
                "content_ko": c_row['content_ko'],
                "content_zh": c_row['content_zh'],
                "image_count": c_row['image_count'],
                "image_urls": process_image_urls(c_row['image_urls']),
                "local_image_paths": process_image_urls(c_row['local_image_paths']),
                "commented_at": c_row['commented_at'],
                "fan_username": c_row['fan_username'],
                "fan_avatar": add_domain_to_url(c_row['fan_avatar']),
                "fan_local_avatar": add_domain_to_url(c_row['fan_local_avatar']),
                "iu_replies": []
            }

            # 获取 IU 对该评论的回复
            cursor.execute("""
                SELECT
                    ir.id,
                    ir.content_ko,
                    ir.content_zh,
                    ir.image_count,
                    ir.image_urls,
                    ir.local_image_paths,
                    ir.replied_at
                FROM iu_replies ir
                WHERE ir.reply_to_fan_comment_id = ?
                ORDER BY ir.replied_at ASC
            """, (c_row['id'],))

            for r_row in cursor.fetchall():
                comment["iu_replies"].append({
                    "id": r_row['id'],
                    "content_ko": r_row['content_ko'],
                    "content_zh": r_row['content_zh'],
                    "image_count": r_row['image_count'],
                    "image_urls": process_image_urls(r_row['image_urls']),
                    "local_image_paths": process_image_urls(r_row['local_image_paths']),
                    "replied_at": r_row['replied_at']
                })

            post["fan_comments"].append(comment)

        # 获取 IU 对帖子的直接回复（不是对评论的回复）
        cursor.execute("""
            SELECT
                ir.id,
                ir.content_ko,
                ir.content_zh,
                ir.image_count,
                ir.image_urls,
                ir.local_image_paths,
                ir.replied_at
            FROM iu_replies ir
            WHERE ir.post_id = ? AND (ir.is_reply_to_comment = 0 OR ir.reply_to_fan_comment_id IS NULL)
            ORDER BY ir.replied_at ASC
        """, (row['id'],))

        for r_row in cursor.fetchall():
            post["direct_iu_replies"].append({
                "id": r_row['id'],
                "content_ko": r_row['content_ko'],
                "content_zh": r_row['content_zh'],
                "image_count": r_row['image_count'],
                "image_urls": process_image_urls(r_row['image_urls']),
                "local_image_paths": process_image_urls(r_row['local_image_paths']),
                "replied_at": r_row['replied_at']
            })

        posts.append(post)

    if not posts:
        print(f"✓ No posts for {folder_name}")
        conn.close()
        return

    # 分页导出
    page_size = 20
    total_pages = (len(posts) + page_size - 1) // page_size

    for page in range(1, total_pages + 1):
        start = (page - 1) * page_size
        end = start + page_size
        page_data = posts[start:end]

        output = {
            "page": page,
            "totalPages": total_pages,
            "total": len(posts),
            "data": page_data
        }

        with open(f'{DATA_DIR}/{folder_name}/page-{page}.json', 'w', encoding='utf-8') as f:
            json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"✓ Exported {total_pages} pages to {folder_name}/ ({len(posts)} posts)")
    conn.close()

def export_search_index():
    """导出搜索索引"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            ir.id,
            ir.content_ko,
            ir.content_zh,
            ir.reply_to_username,
            fc.content_ko as fan_comment_ko,
            fc.content_zh as fan_comment_zh,
            ((ir.id - 1) / 50) + 1 as page
        FROM iu_replies ir
        LEFT JOIN fan_comments fc ON ir.reply_to_fan_comment_id = fc.id
        ORDER BY ir.id
    """)

    index = []
    for row in cursor.fetchall():
        index.append({
            "id": row['id'],
            "content_ko": row['content_ko'],
            "content_zh": row['content_zh'],
            "fan_username": row['reply_to_username'],
            "fan_comment_ko": row['fan_comment_ko'],
            "fan_comment_zh": row['fan_comment_zh'],
            "page": row['page']
        })

    output = {
        "total": len(index),
        "index": index
    }

    with open(f'{DATA_DIR}/search-index.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"✓ Exported search-index.json ({len(index)} entries)")
    conn.close()

def main():
    print("🚀 Exporting IU database to JSON...\n")

    export_stats()
    export_fans()
    export_replies()
    export_board_posts('From. IU', 'from-iu')  # IU 发的帖子
    export_board_posts('Dear. IU', 'dear-iu')  # Dear IU 板块的粉丝帖子
    export_board_posts('Free', 'free')          # Free 板块的粉丝帖子
    export_search_index()

    print("\n✅ Export complete!")

if __name__ == '__main__':
    main()
