## Why

删除节点原本直接 `shell.trashItem()` 进系统回收站并从 SQLite 删除记录，应用内**无法恢复**。
同时代码里存在一张"只写不读"的 `deleted_notes` 表和 `initNode` 旧软删除逻辑（UI 无入口），与需求重叠。

## What Changes

- **新增** 应用内回收站：删除的节点保留在 `notes` 表（`"delete"=1`），文件移入 `{storagePath}/.delete/`，侧边栏可查看/恢复
- **新增** 三种删除模式：回收站 / 系统回收站 / 彻底删除（设置页切换；选"彻底删除"需警告弹窗确认）
- **新增** 可配置保留期（默认 30 天），启动时彻底删除过期条目
- **修改** 所有节点查询默认过滤 `"delete"=0`（列表、节点名搜索、全文搜索、反链）
- **移除** 旧的 `deleted_notes` 表与 `initNode` 旧软删除逻辑

## Capabilities

### New Capabilities
- `trash`：删除节点的软删除、查看、整簇恢复与保留期清理

### Modified Capabilities
- `note-storage`：`notes` 表新增 `"delete"` / `last_up_time` 列；查询默认排除已删除

## Impact

- **代码**：
  - electron：`db/db.cjs`、`db/schema.cjs`(新)、`db/searchWorker.cjs`、`ipc/trash.cjs`(新)、`ipc/trashUtils.cjs`(新)、`ipc/file.cjs`、`ipc/settings.cjs`、`nodes/initNode.js`、`common/settings.cjs`、`preload.cjs`、`main.cjs`
  - web：`pages/db/db.js`、`pages/MindMap.jsx`、`pages/trash/Trash.jsx`(新)、`pages/settings/Settings.jsx`、`components/ui/delete-node-dialog.tsx`、`pages/Sidebar.jsx`、`App.jsx`、`i18n/resources/{zh-CN,en}.ts`
