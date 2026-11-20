## Why

首次启动 App 到脑图首帧约 2 秒，正式包与 dev 均如此。实测（105 篇 / 正文 144KB）：主进程初始化约 250ms 全部发生在窗口创建之前，其中 FTS 全量重建 128ms；渲染进程加载 1.9MB 单包约 800ms；首帧脑图 ~1.4s。

随笔记数增长的主要退化项（合成数据实测）：

| 笔记数 / 正文 | 启动 FTS 全量重建 | 启动全量扫描 | `select *` |
|---|---|---|---|
| 105 / 0.14MB | 128ms | 65ms | 2ms |
| 1000 / 1.1MB | 530ms | 126ms | 29ms |
| 5000 / 4.8MB | 2782ms | 526ms | 141ms |

根因：

1. `notes_fts` 在每次 `initializeDatabase` 都被全量重建，而三个触发器本已负责增量同步；
2. `initNode()` 全盘扫描被 `await` 在 `createWindow()` 之前；
3. 脑图首帧 `loadedNodeIds` 为空时先渲染全部节点、再收缩到前三层；
4. 脑图列表 `SELECT *` 把每篇正文搬到渲染进程；
5. 打开笔记时反链的正文 `LIKE` 扫描阻塞正文显示；
6. 编辑器全家桶（tiptap/katex/highlight）静态进入启动包。

## What Changes

- FTS 仅在「索引本次新建且库有数据」或「与 notes 行数不一致」时回填一次，日常靠触发器。
- 窗口先创建并注册 IPC；`initNode` 全盘对账改到首帧后后台执行，完成后发 `notes:reconciled`；失败只记录日志、不退出。
- 脑图首帧直接按「聚焦根 + 前三层」过滤，初始化 effect 复用同一纯函数，可见集合前后一致。
- 脑图列表查询使用列投影，不再传输正文；笔记页保留正文（嵌入预览依赖）。
- 打开笔记先显示正文，反链随后计算；切换笔记丢弃过期结果。
- 编辑器 `TipTapEditor` 改为按需加载，脑图空闲时预取；路由过渡动画保持在 Node 容器上。
- 更新 `MINDMAP_VIEW.md`，记录启动与首帧机制。

## Capabilities

### New Capabilities

- `startup-performance`: 启动关键路径、首帧渲染、列表传输、反链与编辑器加载时机。

### Modified Capabilities

- 无（`note-storage-sync` 的对账与 FTS 触发器契约保持不变）。

## Impact

- `electron/db/db.cjs`、新增 `electron/db/ftsSync.cjs`（+ 单测）
- `electron/main.cjs`、`electron/preload.cjs`
- `web/src/pages/MindMap.jsx`、`web/src/pages/treeUtils.js`（+ 单测）
- `web/src/pages/db/db.js`（+ 单测）、`web/src/pages/note/Node.jsx`
- `web/src/pages/MINDMAP_VIEW.md`
