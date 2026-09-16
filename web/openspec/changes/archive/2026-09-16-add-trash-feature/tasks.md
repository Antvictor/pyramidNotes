## 1. DB 层

- [x] 1.1 `notes` 幂等迁移新增 `"delete"` / `last_up_time` 列，`DROP TABLE IF EXISTS deleted_notes`（`electron/db/schema.cjs` + 单测）
- [x] 1.2 全文搜索 SQL 过滤 `n."delete" = 0`（`electron/db/searchWorker.cjs`）
- [x] 1.3 web 查询默认过滤 `"delete" = 0`；`insert`/`update` 自动写 `last_up_time`（`web/src/pages/db/db.js` + 测试更新）

## 2. 主进程：删除 / 回收站

- [x] 2.1 `electron/ipc/trashUtils.cjs`：纯逻辑（`isRoot`/`filterDeletableIds`/`collectCluster`/`listTrashBoundaries`/`isExpired`）+ 单测
- [x] 2.2 `electron/ipc/trash.cjs`：`deleteNotes` / `listTrash` / `restoreTrash` / `purgeExpiredTrash`
- [x] 2.3 移除 `file.cjs` 的 `deleteFile`；`saveFile` 写 `last_up_time`
- [x] 2.4 设置默认值（`deleteMode`/`trashRetentionDays`）、preload 暴露新 IPC、main 注册、保留期变更即清理

## 3. 启动同步

- [x] 3.1 `electron/nodes/initNode.js` 重写：移除旧软删除与文件缺失推断，接入保留期清理

## 4. 前端

- [x] 4.1 MindMap 删除改走 `deleteNotes`（删根时剔除 `top='0'`，UI 过滤用 `restIds`）
- [x] 4.2 回收站页面 + `/trash` 路由 + 侧边栏入口 + i18n
- [x] 4.3 设置页「删除设置」：三种模式 + 保留期输入（仅回收站模式显示）+ 「彻底删除」警告弹窗
- [x] 4.4 `DeleteNodeDialog` 按 `deleteMode` 决定"不可撤销"文案

## 5. 性能与体验（手动测试中发现的回归）

- [x] 5.1 恢复乐观删除 UI；回收站写库合并为单事务，`getTrashDir` 移出循环
- [x] 5.2 创建/移动改为乐观 UI + 帧同步居中（去掉固定 300ms 延迟）
- [x] 5.3 节点位置过渡动画（拖拽中禁用，避免跟手延迟）
- [x] 5.4 统一两次布局：缓存实测尺寸供主布局复用
- [x] 5.5 实测布局改为逐帧应用（去掉 200ms 固定延迟）
- [x] 5.6 挂载缓存：返回脑图首帧恢复数据/尺寸/视口；结构比较（忽略 `content`/`last_up_time`）避免无谓重排

## 6. 验证

- [x] 6.1 单测：`node --test electron/ipc/trashUtils.test.cjs`（10/10）、
  `ELECTRON_RUN_AS_NODE=1 ./electron/node_modules/.bin/electron --test electron/db/schema.test.cjs`（4/4）、
  web 非-DOM 测试全绿
- [x] 6.2 `vite build` 通过；真实 App 启动执行迁移并打印 `Purged expired trash entries: 0`；
  真实 DB 校验含 `delete`/`last_up_time` 且 `deleted_notes` 已删除
- [x] 6.3 手动回归：三种删除模式、整树/单节点恢复、删根保留根、保留期清理、查询过滤、性能手感
