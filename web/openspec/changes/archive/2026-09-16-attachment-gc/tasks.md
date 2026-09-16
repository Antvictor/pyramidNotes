## 1. 纯逻辑

- [x] 1.1 新建 `electron/ipc/attachmentRefs.cjs`：`extractImageRefs`（按图片扩展名过滤，排除节点嵌入）、`pickUnreferenced`
- [x] 1.2 新建 `electron/ipc/attachmentRefs.test.cjs`：7 个用例（节点嵌入排除、外链忽略、大小写、null/空、筛选）

## 2. 扫除函数

- [x] 2.1 `attachment.cjs`：新增 `sweepUnreferencedAttachments()`（全部 `notes.content` 含 `delete=1` → 引用集合 → 删除未引用文件；路径穿越校验；只删直接子文件；自身 try/catch）
- [x] 2.2 用 `resolveStoragePath()` 拼目录（不用会 mkdir 的 `resolveAttachmentDir()`）
- [x] 2.3 注册 IPC `sweepAttachments` + 导出

## 3. 触发点

- [x] 3.1 `trash.cjs` `deleteNotes`：仅 `mode !== 'trash'` 后扫除
- [x] 3.2 `trash.cjs` `purgeTrashNodes`：删除条目后扫除
- [x] 3.3 `trash.cjs` `purgeExpiredTrash`：`purged > 0` 时扫除
- [x] 3.4 `initNode.js`：启动时扫除并打印数量

## 4. 文档

- [x] 4.1 新建 `electron/ipc/ATTACHMENT_DESIGN.md`（存储/命名/引用语法/为什么不能按文件名归属/时机/禁忌/调试探针/修复历史）

## 5. 验证

- [x] 5.1 `node --test electron/ipc/attachmentRefs.test.cjs electron/ipc/trashUtils.test.cjs` → 13/13
- [x] 5.2 `node --check` 三个改动文件；`web` 侧 `vite build`（本次未改 web 文件）
- [x] 5.3 只读探针跑真实数据：33 张 / 4 张被引用 / 29 张孤儿（1.79 MB），与算式一致
- [x] 5.4 手动：启动扫除生效；删一篇共享图笔记后图片保留、两篇都删才删；
  回收站笔记图片保留且恢复正常；编辑器删图保存后文件仍在、重启后清理；粘贴图片正常；回归正常
