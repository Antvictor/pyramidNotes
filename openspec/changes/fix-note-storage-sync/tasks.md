## 1. 建立对账纯函数模块

- [ ] 1.1 新增 `electron/nodes/noteSync.cjs`，实现 `toStr` 与 `normalizeFields`（`undefined | null | '' → null`，其余 `String()`）
- [ ] 1.2 实现 `scanNoteFiles(storagePath)`：只扫顶层 `.md`，`readdirSync` 结果排序，无 `id` 或读失败的文件进 `skipped`（含原因）
- [ ] 1.3 实现 `isProtectedRoot`（`id === '1'` 或 `top === '0'`）与 `planReconcile`：输出 `inserts` / `updates` / `removes` / `skipped` / `warn`，含空目录守门与不可达父节点重挂
- [ ] 1.4 重挂目标取 survivors 里 `top === '0'` 的节点 id，取不到才回退 `'1'`（且需该行存在），否则只告警不重挂

## 2. 单元测试

- [ ] 2.1 新增 `electron/nodes/noteSync.test.cjs`（`node:test`，形态对齐 `electron/ipc/trashUtils.test.cjs`）
- [ ] 2.2 覆盖 `normalizeFields` 的类型规整（`top: 1 → '1'`、`top: 0 → '0'`、`left: '' → null`、`title: 2024 → '2024'`、`id: 123 → '123'`、`title` 优先于 `name`）
- [ ] 2.3 覆盖 `scanNoteFiles`：只读引用 `demo-data/zh`（路径由 `__dirname` 解析）得 12 个 note；临时目录里无 `id` 的文件进 `skipped`
- [ ] 2.4 覆盖 `planReconcile` 的插入 / 修复（`top: '1.0'` 与含 frontmatter 的 `content`）/ 恢复 `delete=1` / 硬删与根保护 / 空目录守门
- [ ] 2.5 覆盖重挂在根 id 为 `'1'` 与根 id 为 `'zho01root001'` 两种情形，以及多份文件共用同一 id 的告警
- [ ] 2.6 运行 `node --test electron/nodes/noteSync.test.cjs`，全部通过

## 3. 接入启动与切换存储目录

- [ ] 3.1 重写 `electron/nodes/initNode.js`：`scanNoteFiles` → `planReconcile` → 单事务执行 `inserts` / `updates` / `removes`
- [ ] 3.2 逐条输出 `skipped` 与 `warn` 日志（`console.warn`），并输出一行汇总（扫描数 / 新增 / 修复恢复 / 删除）
- [ ] 3.3 把 `purgeExpiredTrash()` 与 `sweepUnreferencedAttachments()` 各自包进 `try/catch`，失败只记错误、不阻断启动
- [ ] 3.4 确认三处调用点无需改动（`electron/main.cjs:30`、`electron/main.cjs:51`、`electron/ipc/settings.cjs:45` 均已 `await`）

## 4. 修 openFile 的文件缺失兜底

- [ ] 4.1 在 `electron/ipc/file.cjs` 用 `resolveFallbackFile(dataPath, fileName)` 替换 `findFileByNoteId`，按「frontmatter id 是文件名的前缀 + `-`」匹配，支持 id 自身含 `-`
- [ ] 4.2 `openFile` 的 `catch` 分支改调 `resolveFallbackFile`，并确认删除 `split('-')[0]` 取 id 的路径

## 5. 验证

- [ ] 5.1 `node --check electron/nodes/noteSync.cjs electron/nodes/initNode.js electron/ipc/file.cjs` 语法通过
- [ ] 5.2 备份真实存储目录后启动应用，核对 `zbysv-KrUE3M` 的 `top` 由 `'1.0'` 变为 `'1'`、`content like '---%'` 的行数归零
- [ ] 5.3 放入故意不带引号 `top: 1` 的新文件 → 重启 → 节点出现在根下且数据库 `top` 为 `'1'`
- [ ] 5.4 移出某个笔记文件 → 重启 → 该行消失、子节点重挂到根并可见
- [ ] 5.5 从 `.delete/` 拷回文件 → 重启 → 该行 `delete` 为 0 且可见
- [ ] 5.6 把所有 `.md` 移出目录 → 重启 → 行数不变且日志出现跳过删除阶段的告警
- [ ] 5.7 放入无 `id` 的文件 → 重启 → 日志出现跳过告警且不产生数据库行
- [ ] 5.8 用 `./demo-data/install.sh /tmp/pn-sync-test zh` 做干净目录验证，并在真实目录与该目录间来回切换确认无回归
- [ ] 5.9 记录本变更的自动化覆盖边界：`initNode.js` 与 `file.cjs` 依赖 electron / better-sqlite3，无自动化测试，仅靠手动验证

## 6. 修 promoteChildren 与重挂落点（补验发现的缺陷）

- [x] 6.1 确认缺陷：`promoteChildren` 只改数据库不写 `.md`，导致启动对账按陈旧文件把子节点挪走
- [x] 6.2 `noteSync.cjs` 的重挂目标改为「沿 `top` 链上溯到最近的可见祖先」，整链无可见祖先才回退到根，并对成环链终止
- [x] 6.3 补 3 个单测：父在回收站时落到祖父、可穿过多层已删除父节点、祖先链成环不死循环
- [x] 6.4 `web/src/pages/MindMap.jsx` 的 `promoteChildren` 改为 async 并逐个 `updateYaml` 写文件（照抄 `executeMoveNode` 的 DB + 文件双写），调用点改 `await`
- [x] 6.5 在副本上用真实数据复验：7 个子节点由「被挪到根」变为「保持 `Y_28g9iuQagi` 不动」，对账对该批节点产生 0 条 UPDATE
- [x] 6.6 渲染侧 lint 无新增问题（既有 2 处 `no-unused-vars` 与本次改动无关）
- [ ] 6.7 记录：`promoteChildren` 属渲染侧，无单测；`promoteChildren` 的正确性只能靠真实删除操作 + 重启验证
- [x] 6.8 `scanNoteFiles` 为每条笔记记录来源文件名；`planReconcile` 返回 `reattached`（待回写的文件名 + 修正后的 top）
- [x] 6.9 新增 `writeNoteTop(filePath, top)`：合并 frontmatter 写回，保留其余字段与正文
- [x] 6.10 `initNode` 落库后逐个回写 `reattached`，失败只告警不阻断；汇总日志加「回写文件 N」
- [x] 6.11 补 2 个单测：`reattached` 登记、`writeNoteTop` 保留其它 frontmatter 与正文
- [x] 6.12 副本复验收敛：第 1 次重挂 7 条 + 回写 7 个文件，第 2 次均为 0，文件里不再残留旧上级
