# 附件图片生命周期说明

> 维护提示：修改**图片保存、引用语法、删除/清理**相关代码前**必读本文档**。
> 此区域的坑在于「看起来能按文件名判断归属，其实不能」，判断错会**误删别篇笔记还在用的图**。

## 存储与命名

| 项 | 值 |
|---|---|
| 目录 | `{storagePath}/attachment/img/` |
| 文件名 | `{sanitize(笔记名)}-{NNN}.{ext}`，如 `苹果App上架-003.png` |
| 计数器 | `getNextCounter` **扫描目录**取同前缀 `max+1`（`electron/ipc/attachment.cjs:30-46`） |
| 保存入口 | `saveAttachmentFromBase64` / `saveAttachmentFromPath` |
| 读取 | `readAttachment(fileName)` —— 按**确切文件名**读，带路径穿越校验 |

**文件名全局唯一**：计数器扫目录 ⇒ 两个同名笔记会得到 `-001` / `-002`，永不撞名；文件系统本身也不允许同名。

## 引用语法

| 形式 | 含义 | 参与清理判定？ |
|---|---|---|
| `![[文件名.ext]]` | **本地图片** | ✅ 是 |
| `![](...)` | **http(s) 外链**（`InternalImageEmbed.tsx:123-126` 只在 `^https?://` 时产生） | ❌ 否 |
| `![[节点id]]` / `![[节点名]]` | **节点嵌入**（`InternalNodeLink.tsx:117-127`） | ❌ 否（靠**扩展名**过滤掉） |

> ⚠️ `![[...]]` 是**图片和节点嵌入共用**的语法，靠 `isImageReference` 区分。
> 因此 `attachmentRefs.cjs` 的 `extractImageRefs` **必须**按图片扩展名过滤，否则会把节点嵌入当成图片引用。

## 清理规则

`attachment.cjs` 的 `sweepUnreferencedAttachments()`：

1. 取**全部** `notes.content`（**含 `delete=1`**）提取图片引用集合
2. `readdir(attachment/img/)`，删除不在该集合里的文件（带路径穿越校验，只删直接子文件）

### 触发时机（**不要乱加**）

| 时机 | 位置 | 为什么 |
|---|---|---|
| 应用启动 | `electron/nodes/initNode.js` | 覆盖编辑器里删掉的图、历史孤儿、上次会话永久删除的笔记 |
| 永久删除后 | `electron/ipc/trash.cjs` 的 `deleteNotes`(`mode!=='trash'`) / `purgeTrashNodes` / `purgeExpiredTrash` | 这些路径**没有撤销**，可立即释放 |
| ❌ **保存时** | —— | 用户删图后可能**撤销**；保存时删文件会让撤销丢图 |

## 为什么容易改坏

1. **归属只能按「引用」判断，不能按文件名前缀**：前缀是**笔记名**而非 id ——
   同名前缀可被多篇笔记共用；笔记重命名后新图换前缀、旧图仍是旧前缀。
2. **共享是真实存在的**：**复制笔记**会把 `![[...]]` 引用一并复制（实测「人生重塑」与「人生重塑-中文」共用两张图）。
   所以"检查其他笔记是否引用"**必需**，删前必须扫**全部**笔记。
3. **`delete=1` 的笔记也是引用者**：回收站里的笔记可恢复，其图片必须保留 —— 扫描时**不能**过滤掉 `delete=1`。
4. **`![[...]]` 是双语法**（图片 / 节点嵌入），漏掉扩展名过滤会收进无关引用。
5. **`resolveAttachmentDir()` 会 mkdir**：在扫除里用它，会让没用过图片的用户每次启动多出一个空目录；
   应改用 `resolveStoragePath()` 拼路径。

## 禁忌

1. **不要在 `saveFile` / 编辑器保存路径里调用扫除**（撤销会丢图）。
2. **不要在引用扫描里过滤掉 `delete=1`**。 
3. **不要用文件名前缀推断图片属于哪篇笔记**。
4. **不要用 `resolveAttachmentDir()` 取扫除目录**（会 mkdir）。
5. **不要删 `attachment/img/` 的子目录或 `.delete/` 里的内容**（后者是回收站的笔记文件）。

## 常见修改速查

| 需求 | 改动点 |
|---|---|
| 改引用语法 | `web/src/core/editor/extensions/InternalImageEmbed.tsx`（序列化）+ `InternalNodeLink.tsx`（解析）+ **同步** `electron/ipc/attachmentRefs.cjs` 的正则 |
| 改支持的图片扩展名 | `attachment.cjs` 的 `IMAGE_EXTENSIONS` + `attachmentRefs.cjs` 的 `IMAGE_EXTENSIONS` + `web/src/core/editor/extensions/attachmentUtils.ts` |
| 改清理时机 | `initNode.js` / `trash.cjs`（见上表，注意禁忌 1） |
| 手动触发清理 | IPC `sweepAttachments` |

## 调试探针

列出"当前会被清理掉"的图片（**只列不删**，安全）：

```bash
ELECTRON_RUN_AS_NODE=1 ./electron/node_modules/.bin/electron -e "
const fs=require('fs'),D=require('./node_modules/better-sqlite3');
const dir=process.env.HOME+'/Documents/notes/attachment/img';
const { extractImageRefs, pickUnreferenced } = require('./electron/ipc/attachmentRefs.cjs');
const d=new D(process.env.HOME+'/Documents/notes/.data',{readonly:true});
const ref=new Set();
for(const r of d.prepare('SELECT content FROM notes').all()) for(const x of extractImageRefs(r.content)) ref.add(x);
const files=fs.readdirSync(dir);
const orphans=pickUnreferenced(files, ref);
let bytes=0; for(const f of orphans){ try{bytes+=fs.statSync(dir+'/'+f).size}catch{} }
console.log('files:',files.length,'| orphans:',orphans.length,'|', (bytes/1024/1024).toFixed(2)+' MB');
console.log(orphans.join(', '));
"
```

## 修复历史

- **2026-09-16**：首次实现 —— 新增 `attachmentRefs.cjs`（引用提取/未引用筛选）+ `sweepUnreferencedAttachments()`，
  挂在启动与三处永久删除路径。此前图片**只增不删**，实测 30 张里 27 张是孤儿（1.76 MB）。
