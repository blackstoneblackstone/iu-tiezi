#!/usr/bin/env python3
"""
统一 IU 头像文件名

将所有数字命名的 IU 头像 URL 统一为同一个文件名。
例如：
  - 14972286.jpg → iu-avatar.jpg
  - 1383106141.jpeg → iu-avatar.jpg
  - 1771524890.jpeg → iu-avatar.jpg
  - 80296812.jpg → iu-avatar.jpg
  - 900785573.jpg → iu-avatar.jpg
"""

import json
import os
import re
from pathlib import Path

# 云端头像域名
IMAGE_DOMAIN = 'https://dearimage.iu101.org'

# 统一的头像文件名
UNIFIED_AVATAR_NAME = 'iu-avatar.jpg'
UNIFIED_AVATAR_URL = f'{IMAGE_DOMAIN}/images/{UNIFIED_AVATAR_NAME}'

# 需要替换的旧头像文件名（数字命名的）
OLD_AVATAR_PATTERNS = [
    '14972286.jpg',
    '1383106141.jpeg',
    '1771524890.jpeg',
    '80296812.jpg',
    '900785573.jpg',
]

# 构建完整的 URL  patterns
OLD_AVATAR_URLS = [
    f'{IMAGE_DOMAIN}/images/avatars/{pattern}'
    for pattern in OLD_AVATAR_PATTERNS
]


def unify_avatar_in_file(file_path):
    """在单个文件中统一头像 URL"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    replacements = 0
    
    for old_url in OLD_AVATAR_URLS:
        if old_url in content:
            content = content.replace(old_url, UNIFIED_AVATAR_URL)
            count = original_content.count(old_url) - content.count(old_url)
            replacements += count
            print(f"  替换：{old_url} → {UNIFIED_AVATAR_URL} ({count} 处)")
    
    if replacements > 0:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  ✓ 已更新：{file_path}")
    
    return replacements


def main():
    print("🔄 统一 IU 头像文件名...\n")
    
    # 查找所有 JSON 文件
    data_dir = Path('data')
    json_files = list(data_dir.rglob('*.json'))
    
    total_replacements = 0
    updated_files = 0
    
    for json_file in json_files:
        replacements = unify_avatar_in_file(str(json_file))
        if replacements > 0:
            updated_files += 1
            total_replacements += replacements
    
    print(f"\n✅ 完成!")
    print(f"   扫描文件：{len(json_files)}")
    print(f"   更新文件：{updated_files}")
    print(f"   总替换数：{total_replacements}")
    print(f"\n统一头像 URL: {UNIFIED_AVATAR_URL}")


if __name__ == '__main__':
    main()
