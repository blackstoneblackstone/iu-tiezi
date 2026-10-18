---
name: from-iu-tiezi
description: 同步 Berriz 上 IU 的 From. IU、Dear. IU 和 Free 三个板块的帖子与回复，翻译中文、迁移图片、核对问答关系，并更新网站 JSON 与 Cloudflare 部署。
---

# IU 帖子同步

本技能覆盖网站的三个板块：`From. IU`、`Dear. IU`、`Free`。目标是同步 **IU 发布或回复过的互动**，不是抓取板块里所有未获 IU 回复的普通帖子。默认网站工作目录为 `/Volumes/C/code/iu-tiezi`，实际操作前确认路径及当前工作树；该目录可能有用户尚未提交的数据，必须保留。`git@github.com:blackstoneblackstone/iu-tiezi.git` 的 `main` 已改作本技能仓库，不能把网站工作目录直接拉取、合并或推送到该分支。改造前已提交的网站版本在 `website-archive-2026-10-18` 分支，本地未提交数据不在归档中。

## 板块与数据模型

| Berriz 板块 | 网站目录 | 主帖作者 | 主要结构 |
|---|---|---|---|
| `From. IU` | `data/from-iu/` | IU | IU 主帖、粉丝评论、挂在正确父评论下的 IU 回复 |
| `Dear. IU` | `data/dear-iu/` | 粉丝 | 粉丝主帖及 IU 直接回复；如有回复粉丝评论，也保留父子层级 |
| `Free` | `data/free/` | 粉丝 | 与 Dear. IU 相同 |

`data/replies/` 是三板块的综合时间线；`data/search-index.json`、`data/stats.json` 和 `data/fans.json` 也随更新同步。板块数据每页 20 条，综合时间线每页 50 条，以项目现有格式和 `scripts/merge_timeline_json.py` 为准，不要只把新条目塞进第一页或手工改统计。去重按原帖 UUID 和 Berriz 回复 `contentId`，不是按显示序号。

## 获取原始数据

1. 读取现有三个板块全部 `page-*.json`，记录最新时间、已知原帖 UUID、IU 回复 ID，并检查工作目录改动。不要运行会重新导出旧 SQLite 数据并覆盖新 JSON 的 `scripts/export_data.py`。
2. 分页读取 `GET https://svc-api.berriz.in/service/v2/community/5/artist/48/archive?communityId=5&pageSize=99`；后续页使用响应 `data.cursor.next` 作为 `next` 参数。检查 `data.hasNext`，翻页直到覆盖现有数据的时间边界，而非固定只抓第一页。按 `board.boardName` 分流三板块，保存**完整原始** `archive` 分页快照。
3. 对缺失的 `postId` 获取 `GET /service/v1/community/5/post/{postId}?languageCode=zh-Hans`，保存原始详情及 `writer`、`post`、`boardInfo`、`media`。对 `replyInfo.isReply=true` 的 IU 回复，以 `parentCommentSeq` 获取 `GET /service/v1/comment/comments/{seq}?languageCode=zh-Hans`，保存原始评论详情。三类原始响应留在 `work/<batch>/`，不要把临时响应混进公开数据。
4. 若详情不可访问、被删除、字段缺失或 API 报错，将对应 UUID、回复 ID、错误码列入批次清单，保留原始归档，但**不要编造帖子或猜测译文**。重试应有上限；未能取到可信原文的记录不能称为已同步。

Archive 响应中的 `contentId` 是 IU 动作 ID，`postId` 是原帖 UUID；`contentId == postId` 表示 IU 自己发帖。直接回复粉丝主帖通常 `replyInfo.isReply=false`，评论内回复通常 `isReply=true` 且有 `parentCommentSeq`。以实际响应字段为准，不能把 `isReply=false` 一律当作 IU 主帖。

## 问答配对与中文翻译

- **唯一父评论依据是 `parentCommentSeq`**。定位后再核对原帖 UUID、粉丝昵称、韩语原文、评论时间和 IU 回复时间。不能按抓取列表位置、相邻时间、相同昵称或相同文本猜配。找不到唯一父评论时停止该条入库。
- 译文绑定到稳定的原帖 UUID、评论 seq 或 IU `contentId`。同文评论可能出现多次，不可只以韩语文本作翻译映射键，也不能按数组顺序回填。
- 每条互动逐条阅读「粉丝韩语原帖/原评论 → 中文翻译 → IU 韩语回复 → 中文翻译」，判断问答语义是否连贯，保留语气词、表情及昵称；不要把 IU 的回答翻译成另一位粉丝的问题的答案。作品名、行程、健康及演唱会细节若需背景解释，先核实原始资料；不确定时保留原名并避免推断。
- 每批保存人工审过的 `qa/*-reviewed-pairs.json`，包括直接回复粉丝主帖的问答和回复粉丝评论的问答。审核记录应包含稳定 ID、可辨识的中韩原文片段和明确的语义判断，不能仅让写入脚本自动生成一份与数据相同的 JSON 充当审核。

## 图片与数据写入

- 帖图取 `data.post.media.photo[].imageUrl`；评论图取评论详情 `data.content.media.photo[]`；头像取 `data.writer.imageUrl` 或评论作者字段。保留多图的顺序与现有 `|` 分隔格式，准确写入 `image_count`。不要把原始 Berriz CDN 图片 URL 当作已迁移 URL。
- 下载图片并用 `wrangler r2 object put dear-iu/<key> --file=<path> --remote` 上传到 R2；头像用 `images/avatars/`，帖图用 `images/posts/`，评论图用 `images/comments/`，IU 回复图用 `images/replies/`。确认公开地址 `https://dearimage.iu101.org/<key>` 返回 200 后再写入 JSON。已有同名对象可验证后复用。
- 更新前备份受影响的用户数据文件。沿用三个板块现有 JSON 字段与分页顺序，`Dear. IU` / `Free` 的粉丝主帖和 IU 直接回复须同时出现在板块数据与综合时间线；`From. IU` 评论的 IU 回复必须挂在经 `parentCommentSeq` 确认的粉丝评论下。保留未改动数据、已有翻译和图片链接。
- 运行 `python3 scripts/merge_timeline_json.py` 同步 `data/replies`、搜索索引及统计；检查总数、分页、时间顺序、重复 UUID、空译文、图片可达性和板块归属。不要用旧的 `scripts/export_data.py` 覆盖新数据。

## 部署前后验收

1. 对每批原始 `archive` / `details` 和人工审核清单运行 `python3 scripts/check_post_reply_integrity.py --source <source.json> --review <reviewed-pairs.json>`。直接回复和评论内回复都要覆盖；失败先修正，不能仅比较同一脚本产出的两个文件。
2. 运行 `git diff --check`，核对差异只包含预期文件；用本地 HTTP 服务预览页面时遵守项目 `AGENTS.md`，不得用 `file://`。仔细展开新帖评论，核对顺序、中文问答、图片和分页。
3. 用户要求部署时，按项目现有 Cloudflare Workers 配置部署；确保 `work/`、审核快照及凭据不进入公开 assets。部署后从三个正式板块域名（含 `fromiu.iu101.org`）打开中文页面，抽查新帖/评论，比较线上 JSON 与本地文件，并确认图片可访问。
4. 汇报各板块新增帖子与 IU 回复数、无法访问的原始记录、审核/部署结果及尚未完成的缺口。未做完线上问答抽查，不得声称「帖子和回复没有错乱」或「全部同步」。
