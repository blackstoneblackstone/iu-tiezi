#!/usr/bin/env python3
"""
图片压缩脚本 - 将图片压缩到指定大小以内

用法:
    python3 scripts/compress_images.py [文件路径...] [--max-size KB]

示例:
    python3 scripts/compress_images.py image/iu-avator.png --max-size 100
    python3 scripts/compress_images.py image/*.png --max-size 50
"""

from PIL import Image
import os
import sys
import argparse


def compress_image(input_path, output_path=None, max_size_kb=100):
    """压缩图片到指定大小以内"""
    if output_path is None:
        output_path = input_path
    
    img = Image.open(input_path)
    
    # 获取原始尺寸
    original_size = os.path.getsize(input_path)
    print(f"处理：{input_path}")
    print(f"  原始大小：{original_size / 1024:.1f}K")
    print(f"  原始尺寸：{img.width}x{img.height}")
    
    # 尝试不同的质量和尺寸参数
    quality = 85
    scale = 1.0
    
    while quality >= 10 or scale >= 0.3:
        # 调整尺寸
        if scale < 1.0:
            new_size = (int(img.width * scale), int(img.height * scale))
            resized = img.resize(new_size, Image.Resampling.LANCZOS)
        else:
            resized = img
        
        # 保存为临时文件检查大小
        temp_path = output_path + '.tmp'
        resized.save(temp_path, 'PNG', optimize=True, compress_level=9)
        
        file_size = os.path.getsize(temp_path)
        
        if file_size <= max_size_kb * 1024:
            # 压缩成功，移动文件
            os.rename(temp_path, output_path)
            print(f"  压缩后大小：{file_size / 1024:.1f}K")
            print(f"  缩放比例：{scale:.2f}")
            print(f"  新尺寸：{resized.width}x{resized.height}")
            return True
        
        # 降低质量或缩小尺寸
        if quality > 20:
            quality -= 10
        else:
            scale -= 0.1
        os.remove(temp_path)
    
    # 如果还是太大，强制保存
    final_size = (int(img.width * 0.3), int(img.height * 0.3))
    final_img = img.resize(final_size, Image.Resampling.LANCZOS)
    final_img.save(output_path, 'PNG', optimize=True, compress_level=9)
    file_size = os.path.getsize(output_path)
    print(f"  最终大小：{file_size / 1024:.1f}K")
    return True


def main():
    parser = argparse.ArgumentParser(description='压缩图片到指定大小以内')
    parser.add_argument('files', nargs='+', help='要压缩的图片文件路径')
    parser.add_argument('--max-size', type=int, default=100, 
                        help='最大文件大小 (KB)，默认 100KB')
    parser.add_argument('-o', '--output', help='输出文件路径 (默认覆盖原文件)')
    
    args = parser.parse_args()
    
    for file_path in args.files:
        if not os.path.exists(file_path):
            print(f"错误：文件不存在 - {file_path}")
            continue
        
        output_path = args.output if args.output and len(args.files) == 1 else None
        compress_image(file_path, output_path, max_size_kb=args.max_size)
        print()
    
    print("压缩完成!")


if __name__ == '__main__':
    main()
