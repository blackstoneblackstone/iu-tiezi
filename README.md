# Dear IU 💜

> IU (아이유) 粉丝社区回帖合集网站
> 收录 IU 在官方社区与粉丝的互动内容，支持中韩双语浏览

[![Website](https://img.shields.io/website?url=https%3A%2F%2Fdeariu.iu101.org)](https://deariu.iu101.org)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

🌐 **在线访问**: [deariu.iu101.org](https://deariu.iu101.org)

---

## ✨ 功能特色

### 📱 内容板块
- **From. IU** - IU 亲自发布的帖子
- **Dear. IU** - 粉丝写给 IU 的信
- **Free** - 社区自由讨论区

### 🔍 搜索与筛选
- 按昵称、内容搜索
- 点击粉丝头像查看所有互动
- 筛选带图片的帖子

### 🎨 用户体验
- **骨架屏加载** - 流畅的加载体验
- **无限滚动** - 无需手动翻页
- **图片查看器** - 支持缩放、左右切换、键盘操作
- **回到顶部** - 一键返回页面顶部
- **深色主题** - 护眼的 OLED 深色模式

### 🌐 多语言支持
- 🇨🇳 中文 (简体)
- 🇰🇷 한국어 (韩语)

### 📈 SEO 优化
- Geo 元标签（首尔定位）
- Open Graph / Twitter Card
- JSON-LD 结构化数据
- 多语言 hreflang 标签
- Sitemap / Robots.txt

---

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| 前端 | 原生 HTML5 / CSS3 / JavaScript (ES6+) |
| 样式 | CSS Variables / Dark Theme |
| 字体 | Noto Sans SC / Noto Sans KR |
| 数据 | JSON (静态生成) |
| 构建 | 无构建系统，纯静态文件 |

---

## 🚀 本地运行

```bash
# 克隆项目
git clone https://github.com/blackstoneblackstone/iu-tiezi.git
cd iu-tiezi

# 启动本地服务器
python3 -m http.server 8000

# 访问
open http://localhost:8000
```

---

## 📁 目录结构

```
iu-tiezi/
├── index.html              # 首页（全部帖子）
├── from-iu.html            # From. IU 板块
├── dear-iu.html            # Dear. IU 板块
├── free.html               # Free 板块
├── sitemap.xml             # 站点地图
├── robots.txt              # 爬虫规则
│
├── css/
│   └── style.css           # 全局样式
│
├── js/
│   ├── common.js           # 公共模块（工具函数、渲染组件）
│   ├── replies.js          # 首页逻辑
│   ├── from-iu.js          # From IU 页面
│   ├── dear-iu.js          # Dear IU 页面
│   └── free.js             # Free 页面
│
├── data/                   # JSON 数据（由脚本生成）
│   ├── stats.json          # 统计数据
│   ├── fans.json           # 粉丝列表
│   ├── search-index.json   # 搜索索引
│   ├── replies/            # 回帖分页数据
│   ├── from-iu/            # From IU 分页数据
│   ├── dear-iu/            # Dear IU 分页数据
│   └── free/               # Free 分页数据
│
├── image/                  # 图片资源
│   ├── favicon.png         # 网站图标
│   ├── iu-avator.png       # IU 头像
│   ├── coffee-qr.png       # 赞助二维码
│   └── ...
│
└── scripts/
    └── export_data.py      # 数据导出脚本
```

---

## 📊 数据导出

从 SQLite 数据库导出 JSON 文件：

```bash
python3 scripts/export_data.py
```

生成的文件：
- `stats.json` - 统计信息
- `fans.json` - 粉丝列表（含头像、回复数）
- `replies/page-{n}.json` - 回帖分页（每页 50 条）
- `search-index.json` - 全文搜索索引

---

## ⌨️ 快捷键

| 按键 | 功能 |
|------|------|
| `ESC` | 关闭图片查看器 |
| `←` `→` | 切换图片 |
| `+` `-` | 放大/缩小图片 |
| `0` | 重置图片缩放 |

---

## 🎨 设计规范

### 颜色变量
```css
--primary: #9779ea;        /* 主色调（紫色） */
--primary-light: #C4B5E0;  /* 浅紫 */
--primary-dark: #7B5DC4;   /* 深紫 */
--bg-oled: #0A0A0F;        /* OLED 黑 */
--text-primary: #F5F5F7;   /* 主文字 */
```

### 断点
- **Desktop**: > 600px (双列瀑布流)
- **Mobile**: ≤ 600px (单列)

---

## 📝 更新日志

### v1.2.0 (2026-04-06)
- ✨ 添加骨架屏加载效果
- ✨ 添加回到顶部按钮
- ✨ 增强图片查看器（缩放、导航、键盘支持）
- ✨ 实现无限滚动替代分页
- 🔍 添加完整 SEO 优化
- 🎨 优化按钮样式

### v1.1.0
- 🌐 添加中韩双语支持
- 🔍 添加搜索功能
- 👤 添加粉丝筛选

### v1.0.0
- 🎉 初始版本发布

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

[MIT License](LICENSE)

---

## 💜 致谢

- 数据来源：IU 官方社区
- 网站由 **黑石大师** 基于公开信息整理
- 纯为方便 Uaena 们，为爱发电

---

<p align="center">
  Made with 💜 for <b>IU</b> & <b>Uaena</b>
</p>