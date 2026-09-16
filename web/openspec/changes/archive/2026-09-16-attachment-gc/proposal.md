## Why

附件图片（`{storagePath}/attachment/img/`）**只增不删** —— `attachment.cjs` 只有
`saveAttachmentFromBase64` / `saveAttachmentFromPath` / `readAttachment`，没有任何删除路径。
实测用户数据：**30 张图里 27 张是孤儿，占用 1.76 MB**（多为测试残留 `test-*.png`）。

需要：① 删除笔记时同时删掉它**独占**的图片；② 编辑里删掉的图，无人引用后也要删掉。

### 探索阶段的关键结论（决定设计）

- 引用语法：本地图片是 **`![[文件名.ext]]`**（`InternalImageEmbed.tsx:120-128`；`![](...)` 仅 http 外链）
- **`![[...]]` 与节点嵌入共用语法**（`InternalNodeLink.tsx:117-127`）→ 必须按**图片扩展名**过滤
- 文件名**全局唯一**（`getNextCounter` 扫目录取 max+1）→ 引用无歧义
- **归属只能按引用判断，不能按文件名前缀**（前缀是笔记名，同名笔记/重命名都会失真）
- **共享确实存在**：复制笔记会把引用一并复制（实测「人生重塑」与「人生重塑-中文」共用两张图）
  → "检查其他笔记是否引用"是**必需**的
- 全表引用扫描实测 **0.025 ms** → 性能不是问题

## What Changes

- **新增** `electron/ipc/attachmentRefs.cjs`：纯逻辑（`extractImageRefs` / `pickUnreferenced`）+ 单测
- **新增** `attachment.cjs` 的 `sweepUnreferencedAttachments()`：按**全部** `notes.content`（含 `delete=1`）
  的引用集合，删除 `attachment/img/` 下无人引用的文件
- **触发点**：应用启动（`initNode.js`）+ 三处永久删除后（`deleteNotes` 非 trash 模式、`purgeTrashNodes`、
  `purgeExpiredTrash`）；**不**在保存时触发（保住撤销）
- **新增** `electron/ipc/ATTACHMENT_DESIGN.md` 机制说明

## Capabilities

### New Capabilities
- `attachment-gc`：附件图片的引用扫描与孤儿清理

## Impact

- **代码**：`electron/ipc/attachmentRefs.cjs`(新)、`electron/ipc/attachment.cjs`、
  `electron/ipc/trash.cjs`、`electron/nodes/initNode.js`、`electron/ipc/ATTACHMENT_DESIGN.md`(新)
- **数据**：首次启动会删除现存孤儿图片（用户已确认一并清理）
