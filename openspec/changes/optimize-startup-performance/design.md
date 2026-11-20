## Context

启动链路实测（105 篇 / 144KB，生产构建）：

- `app.whenReady` → 窗口创建 ≈ 350ms，其中 `initializeDatabase`（含 FTS 全量重建 128ms）与 `initNode`（扫描 65ms + 对账/清理）全部挡在窗口前；
- 窗口 → 脑图首帧 ≈ 1s：1.9MB 单包解析 + React 挂载 + `SELECT *` + 全图布局；
- 合成库 5000 篇时，仅 FTS 重建（2.8s）与全量扫描（0.5s）就足以让启动劣化到 4s+。

## Decisions

### FTS：按需回填，而不是每次重建

`notes_ai / notes_au / notes_ad` 触发器已负责日常同步；全量回填只在触发器覆盖不到的场景需要：

- 索引表本次刚创建（历史库升级、损坏恢复）；
- `notes` 与 `notes_fts` 行数不一致（历史脏数据/触发器曾缺失）。

判定抽成纯函数 `shouldRebuildFts({ hadFts, notesCount, ftsCount })`，在 `CREATE VIRTUAL TABLE` 前查 `sqlite_master` 得到 `hadFts`。新库（0 行）不重建；损坏恢复走同一路径自然跳过。

被否方案：用 `PRAGMA user_version` 记录迁移版本——需要引入版本管理机制，且恢复/侧载数据库时仍要兜底行数检查；当前两条件已足够。

### 窗口先出现：对账后置 + 完成通知

`initializeDatabase` 必须在窗口前（渲染端立即 `dbQuery`），但它现在约 40ms。`initNode` 改为 `createWindow` 之后后台执行：

- 单飞 Promise 防重入；`reloadDatabase` 在关闭连接前 await 在途对账；
- 无论成败都在结束时发送 `notes:reconciled`，失败带 `error`；失败不再退出应用；
- 渲染端**先订阅再读库**：订阅前完成的对账由首次 `select` 读到；订阅后完成的由事件触发重读，`sameGraph` 去重；
- **事件可能早于订阅**（对账比 React 挂载快）：主进程同时维护可拉取状态 `notes:reconcileState`，渲染端挂载时先拉取再读库，避免「空库永远不建根」；
- **建根守卫**：库为空但目录有文件（损坏恢复）时，渲染端若抢建 `1-root.md` 会与对账导入的既有根形成双根。用模块级 `reconcileDone`（跨卸载保留）同时守卫挂载 effect 与布局 effect 的建根分支，事件或拉取状态到达后解除；
- **写门控**：对账期间非 SELECT 的 `dbQuery` 等待对账结束再执行。渲染端新建节点是「先写库、后写文件」，若与对账的计划阶段交错，新行会被当作「无文件的孤儿」硬删除。`electron/db/writeGate.cjs` 提供单飞闸门，对账失败也放行写入。

### 首帧三层：与初始化 effect 同源

`collectVisibleIdsToDepth(nodes, rootId, maxDepth=2)` 用 BFS 返回聚焦根三层内可达节点；`displayedNotes` 在 `loadedNodeIds` 为空时直接用它过滤，初始化 effect 复用同一函数写入 `loadedNodeIds`。两处同源，行为与旧「先全图后收缩」的最终状态一致，但不再付出全图布局/挂载成本；找不到根时保留旧兜底（返回全部，交给建根逻辑收编孤儿）。

### 列表投影：只对脑图生效

`Table.select` 增加 `columns` 选项，脑图两处列表查询使用 `NOTE_LIST_COLUMNS`。**笔记页 allNodes 保留 `SELECT *`**：编辑器 `![[节点]]` 嵌入预览渲染 `target.content`（`InternalNodeLink.tsx`），投影会让嵌入变空。

### 编辑器按需加载

`TipTapEditor` 改 `lazy` + `Suspense`（fallback 复用既有 loading 样式），容器与入场/退出动画不变；MindMap 挂载后空闲预取同一模块，首次打开基本命中缓存。极冷启动时编辑器可能在容器动画结束后出现，属可接受降级。

### 反链后置

`findBacklinks` 是正文全表 `LIKE`，移到 `ready` 之后执行；切换笔记先清空，并用 effect 清理的 `cancelled` 标志丢弃过期结果。查询语义不变。

## Risks

- 首帧可能短暂显示对账前数据 → 完成事件刷新；数据一致时无差别。
- `ipc/settings.cjs` 的存储目录切换没有等待启动对账 → 用户操作发生在启动后，竞争窗口可忽略。
- 空闲预取在无 `requestIdleCallback` 的环境降级为 `setTimeout(1000)`。
- StrictMode 双执行 → 订阅/退订成对，`sameGraph` 与 `creatingRootRef`/`reconcileDone` 保证幂等。
