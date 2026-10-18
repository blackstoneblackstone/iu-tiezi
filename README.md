# from-iu-tiezi

用于同步 Berriz 上 IU 在 **From. IU、Dear. IU、Free** 三个板块的帖子与回复：抓取原始数据、翻译中文、迁移图片、核对问答关系，并更新网站 JSON。完整操作规范见 [SKILL.md](SKILL.md)。

## 安装

将仓库克隆到 Codex 的 Skills 目录，使 `SKILL.md` 位于 `~/.codex/skills/from-iu-tiezi/SKILL.md`：

```bash
git clone git@github.com:blackstoneblackstone/iu-tiezi.git ~/.codex/skills/from-iu-tiezi
```

如果该目录已经存在，请先确认其中是否有未同步的本地修改，不要直接覆盖。安装后可在任务中使用 `$from-iu-tiezi`。

## 更新时必须核对

评论内的 IU 回复只通过 Berriz 的 `parentCommentSeq` 建立父子关系，不能按列表位置或时间顺序配对。三个板块每批更新都需保留原始快照，逐条核对韩语原帖或评论、中文翻译、IU 韩语回复和中文翻译，并运行项目中的完整性检查；部署后还需在正式页面展开评论抽查。具体步骤和命令以 [SKILL.md](SKILL.md) 及网站项目的 `AGENTS.md` 为准。

## 网站源码

本仓库的 `main` 现用于存放 Skill，**不是 Cloudflare 网站的部署源**。改造前已提交的网站源码保留在 [`website-archive-2026-10-18`](https://github.com/blackstoneblackstone/iu-tiezi/tree/website-archive-2026-10-18) 分支；该归档不包含当时本地尚未提交的改动。不要将网站工作目录直接合并或拉取本仓库的新 `main`。
