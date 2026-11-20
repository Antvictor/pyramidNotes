## 1. FTS 按需回填

- [x] 1.1 新增 `electron/db/ftsSync.cjs`（`shouldRebuildFts`）与 `ftsSync.test.cjs`
- [x] 1.2 `db.cjs` 建表前查 `sqlite_master`，按条件决定是否全量回填
- [x] 1.3 `node --test electron/db/ftsSync.test.cjs` 通过

## 2. 窗口先出现、对账后置

- [x] 2.1 `main.cjs` 单飞 `runReconcile`，`finally` 必发 `notes:reconciled`
- [x] 2.2 `reloadDatabase` 关闭旧库前等待在途对账
- [x] 2.3 `preload.cjs` 暴露 `onNotesReconciled`
- [x] 2.4 `MindMap.jsx` 先订阅再 select、事件重读 + `sameGraph` 去重
- [x] 2.5 `reconcileDone` 守卫挂载 effect 与布局 effect 的建根分支
- [x] 2.6 新增可拉取状态 `notes:reconcileState`，兜底「事件早于订阅」
- [x] 2.7 `writeGate`：对账期间挂起非 SELECT 写入，防止新建节点被当作孤儿删除

## 3. 首帧三层

- [x] 3.1 `treeUtils.js` 新增 `collectVisibleIdsToDepth` + 单测
- [x] 3.2 `displayedNotes` 初始分支按聚焦根三层过滤
- [x] 3.3 初始化 effect 复用同一函数，删除 `computeDepths`

## 4. 列表投影

- [x] 4.1 `db.js` `select` 支持 `columns`，导出 `NOTE_LIST_COLUMNS` + 单测
- [x] 4.2 脑图挂载与存储目录变更两处改用投影
- [x] 4.3 笔记页 allNodes 保留正文（嵌入预览依赖），在代码中注明原因

## 5. 编辑器懒加载

- [x] 5.1 `Node.jsx` `lazy` + `Suspense`，fallback 复用 loading 样式
- [x] 5.2 `MindMap.jsx` 空闲预取编辑器模块（`requestIdleCallback` 降级 `setTimeout`）
- [x] 5.3 构建确认启动 chunk 从 1.9MB 降到约 983KB，编辑器拆出 922KB 懒加载 chunk

## 6. 反链后置

- [x] 6.1 `Node.jsx` 打开时清空反链，`ready` 后异步计算
- [x] 6.2 `cancelled` 标志丢弃切换笔记后的过期结果

## 7. 文档与工件

- [x] 7.1 `MINDMAP_VIEW.md` 新增「启动与首帧」，修复历史追加 2026-11-20
- [x] 7.2 `openspec validate optimize-startup-performance` 通过

## 8. 回归与复测

- [x] 8.1 全量测试、lint 基线（6 errors / 16 warnings）、`vite build` 通过
- [x] 8.2 台架复测：105/1000/5000 篇稳态初始化 19 / 24 / 101ms（旧实现为 128 / 530 / 2782ms，其中含 FTS 全量重建）
- [ ] 8.3 手动验收：首帧三层、对账刷新、动画、反链、切库（Step 6）
