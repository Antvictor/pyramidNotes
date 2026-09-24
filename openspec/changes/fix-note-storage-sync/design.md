## Context

`initNode()` 在三个时机被调用：启动（`electron/main.cjs:30`）、`reloadDatabase` IPC（`electron/main.cjs:51`）、切换存储目录（`electron/ipc/settings.cjs:45`）。原实现只做一件事：读目录 → 对每个 `parsed.data.id` 不在 DB 的文件执行 INSERT。它既没有反向删除，也没有字段规整。

## 根因

### 1. YAML 标量类型 → SQLite TEXT 亲和性

```
文件里 top: 1（不带引号）
  → gray-matter/YAML 解析出 JS number 1
  → better-sqlite3 8.7 按 REAL 绑定（1.0）
  → notes.top 是 TEXT 列，SQLite 做 REAL→TEXT 转换
  → 存成字符串 '1.0'
  → 没有节点 id 是 '1.0' → top 悬空
  → 渲染侧 loadedNodeIds 只覆盖从 root 可达的节点 → 该节点与整个子树不可见
```

`sqlite3 :memory: "create table t(a text); insert into t values(1.0); select quote(a) from t;"` → `'1.0'`，已验证。

同类问题：`title: 2024` 存成 `'2024.0'`（节点名变成小数）、`id: 123` 存成 `'123.0'`（文件名 `{id}-{title}.md` 与 DB id 不再对应）。

### 2. `|| null` 抹掉合法假值

`parsed.data.top || null`：`top: 0`（number 0，假值）→ `null`；`left: ''` → `null`。根文件的 `top` 变成 NULL 后，`electron/ipc/trashUtils.cjs:3` 的 `isRoot()`（`row.top === '0'`）返回 false，根节点会被回收站流程当作可删节点。

### 3. 反向对账缺失

`6ba7a24` 删除了 soft-delete 路径后，`initNode` 只处理「文件有、DB 无」。DB 有行而目录无文件的笔记永远不会被清理。

### 4. content 含 frontmatter

原插入语句存的是 `fs.readFileSync()` 的整份原文，而主程序 `saveFile`（`electron/ipc/file.cjs:80`）存的是正文。两种口径混在一张表里，导致 FTS 检索、搜索摘要片段（`web/src/pages/db/db.js:70`）、反链搜索（`web/src/pages/db/db.js:175` 的 `content LIKE`）都会命中 frontmatter 噪声。

## 契约

存储目录**顶层** `.md` 是唯一事实源（`.delete/`、`attachment/` 为子目录，`.data` 非 `.md`，均天然跳过）。

| 情形 | 动作 |
|---|---|
| 文件无 frontmatter `id` | 跳过 + `console.warn`（不再静默） |
| 文件 id 不在 DB | INSERT |
| 文件 id 在 DB 且 `delete=1` | UPDATE `delete=0` 并刷新字段 = 自动恢复 |
| 文件 id 在 DB 且 `delete=0` 但字段有差异 | UPDATE 差异字段 |
| `delete=0` 行在目录无文件 | 硬删行（FTS 由 `notes_ad` 触发器同步） |
| 目录里 0 个 `.md` | 整体跳过删除阶段 + 告警 |
| 父节点不可达且自身 `delete=0` | 重挂到**最近的可见祖先**（可穿过多层已软删/失踪的父节点），回退到根 + 告警 |

### 字段规整规则

```
toStr(v) = (v === undefined || v === null) ? null
         : (String(v) === '' ? null : String(v))
```

因此 `top: 1 → '1'`、`top: 0 → '0'`、`title: 2024 → '2024'`、`id: 123 → '123'`、`left: '' → null`（与主程序写入口径一致）。

收敛点选在写入层而非渲染层：渲染侧 `"0" === n.top`（`web/src/pages/MindMap.jsx:816`）、`allNotesNodeMap.has(top)`（`web/src/pages/treeUtils.js:9`）依赖严格字符串比较，在写入层保证类型正确比在渲染层到处加兜底更可靠，且能保持单一事实源。

### 根节点保护

硬删阶段保护 `id === '1'` **或** `top === '0'` 的行。比 `trashUtils.isRoot`（只看 `top`）更保守：历史 bug 已把根行的 `top` 写成 NULL，只看 `top` 会误删根。不改 `trashUtils` 的语义（回收站流程仍按原规则），在 `noteSync.cjs` 内定义 `isProtectedRoot`。

### 重挂目标

重挂目标取「沿数据库 `top` 链上溯遇到的第一个可见祖先」，只在整条链都没有可见祖先时才回退到根节点。

**为什么不是根节点**：App 的「仅删除父节点」会把子节点提升到**祖父**节点（`web/src/pages/MindMap.jsx` 的 `promoteChildren`，文案「子节点将提升到上一级。」）。若对账把不可达父节点的子节点一律挂到根，节点会从原位置被甩到树顶，与 App 的语义相反。

根 id 同样不硬编码为 `'1'`：根是 survivors 里 `top === '0'` 的那个节点（`demo-data/zh` 用 `id: "zho01root001"`）。仅当 survivors 里没有任何根时才回退到数据库里可见的 `'1'`，否则只告警不重挂，交给渲染侧「无根则新建根并收编孤儿」的既有逻辑（`MindMap.jsx` 约 830 行）处理。

### 重挂修正回写文件

对账修正了某笔记的 `top` 之后，`initNode` 会把新值写回该 `.md`（`writeNoteTop`，语义与 `file.cjs` 的 `updateYaml` 一致：合并 frontmatter、保留正文）。

不回写的话，文件里那个不可达的旧上级会**每次启动都被重新判定一次**——因为对账以文件为准。它虽然幂等（落点与库中现值相同，`differs` 为假，不产生 UPDATE），但会一直刷告警日志，并且文件和库长期不一致。回写之后文件与库一次收敛，实测第二次启动重挂与回写都是 0 条。

回写只针对「对账修正过 `top`」的笔记，不对任何其它字段做反向写入——方向仍然是文件→库，例外仅限这一处已被判定为不可达的字段。

### 已修复的交互缺陷：promoteChildren 只改库不写文件

实测发现（补验场景 A）：`promoteChildren` 只执行 `db.notes.update({ top: parentId }, { top: grandParentId })`，**不写 `.md` 文件**，而 App 里「移动节点」（`executeMoveNode`）是「改库 + `updateYaml` 写文件」两件都做。

后果：由于对账以文件为准，文件里那个已经不存在的旧上级会在下次启动时被当成真相，把子节点一路挪走。实测复现（用户真实数据、副本上）：

```
删掉 t（其下 7 个子节点）后：
  DB   : 7 个子节点 top = Y_28g9iuQagi（探索）   ← App 的提升正确生效
  文件 : 7 个子节点 top = zbysv-KrUE3M           ← 未更新，已陈旧
对账后（修复前）：7 个子节点 top = 1（根）          ← 被甩到树顶
对账后（修复后）：7 个子节点 top = Y_28g9iuQagi    ← 与 App 一致，且无 UPDATE
```

两处修：`promoteChildren` 补上写文件（根因），对账的重挂目标改为最近可见祖先（兜底，使陈旧文件也不会导致错误落点）。


## 模块划分

`noteSync.cjs` 不 require electron / better-sqlite3，因此可在纯 Node 下用 `node:test` 覆盖全部判定逻辑；`initNode.js` 只负责「取 db → 取路径 → 算 plan → 落事务 → 打日志」。

```
scanNoteFiles(storagePath)            → { notes, skipped }
planReconcile({ notes, skipped, rows }) → { inserts, updates, removes, skipped, warn }
initNode()                            → apply plan in one better-sqlite3 transaction
```

## 风险与取舍

| 取舍 | 影响 | 理由 |
|---|---|---|
| 目录 0 个 `.md` 时跳过删除阶段 | 用户手动清空全部笔记文件后，DB 行残留（节点仍可见但文件缺失） | 真实目录恒有根文件（`1-root.md` / `root-os.md`），「0 个 `.md`」实际只可能是盘未挂载 / iCloud 未下载。宁可留脏行，不可清库 |
| 不清理 `.delete/` 中的旧副本 | 手动拷回文件恢复后，`.delete/` 里遗留同名文件 | 回收站清理只遍历 `delete=1` 的行；本次不扩回收站语义 |
| 被硬删行的 `delete=1` 子孙不入 `removes` | 它们成为顶层回收站条目，可独立恢复 | 回收站条目本就该由保留期机制处理 |
| `title: ""` 且无 `name` 的文件 | 节点名被刷成空字符串 | 「文件即事实」的必然结果，不做特例兜底 |
| 启动时读全部 `.md` | 大库启动 IO 增加 | 原实现同样逐个读取；且 `initializeDatabase` 本来就会整体重建 FTS，启动成本已是 O(n) |

## 非目标

- 不做 `fs.watch` 实时监听：App 运行中往目录丢文件仍需重启或重选目录
- 不改回收站语义，不动 `.delete/` 里已无 DB 行的孤儿文件
- 不做 mtime 比对的冲突合并：文件覆盖 DB
- 不改 `electron/db/db.cjs` 的 FTS 触发器与搜索实现
- 渲染侧只改 `promoteChildren` 一处（补上写文件）；不改 `top === '0'` 等严格字符串比较，也不改删除流程的其他语义
