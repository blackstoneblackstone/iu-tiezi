# IU 回帖合集

IU (아이유) 粉丝社区回帖合集网站，收录 IU 在官方社区与粉丝的互动内容。

## 功能

- 📝 三大板块：From. IU、Dear. IU、Free
- 🔍 搜索功能：按昵称、内容搜索
- 👤 粉丝筛选：点击头像查看该粉丝所有互动
- 🖼️ 图片筛选：筛选有图片的帖子
- 🌐 双语支持：中文 / 한국어

## 本地运行

```bash
python3 -m http.server 8000
```

访问 http://localhost:8000

## 数据导出

```bash
python3 scripts/export_data.py
```

## 目录结构

```
├── index.html          # 全部帖子页面
├── from-iu.html        # From. IU 板块
├── dear-iu.html        # Dear. IU 板块
├── free.html           # Free 板块
├── css/style.css       # 样式文件
├── js/
│   ├── common.js       # 公共模块
│   ├── replies.js      # 首页逻辑
│   ├── from-iu.js      # From IU 页面逻辑
│   ├── dear-iu.js      # Dear IU 页面逻辑
│   └── free.js         # Free 页面逻辑
├── data/               # JSON 数据文件
│   ├── stats.json
│   ├── fans.json
│   ├── search-index.json
│   ├── replies/
│   ├── from-iu/
│   ├── dear-iu/
│   └── free/
└── image/              # 图片资源
```

## License

MIT