# 回收站机制说明

> 维护提示：修改回收站 / 软删除相关代码前**必读本文档**。删除簇判定与整簇恢复依赖 `top` 链与 `"delete"` 标志的一致性，
> 破坏后表现为「删了恢复不全」或「已删节点复活」，且**不报错**，原因见"为什么容易改坏"。

## 数据模型

| 载体 | 位置 | 说明 |
|---|---|---|
| 软删除标志 | `notes."delete"` | INTEGER，`0`=正常，`1`=在回收站 |
| 时间戳 | `notes.last_up_time` | ISO 8601 UTC 字符串；**单列双用**：正常时=最近修改，`"delete"=1` 时=删除时间 |
| 回收站文件 | `{storagePath}/.delete/{id}-{name}.md` | 与正常文件同名校，仅目录不同 |
| 迁移 | `electron/db/schema.cjs` | 幂等加列 + `DROP TABLE IF EXISTS deleted_notes` |

> ⚠️ **`delete` 是 SQLite 关键字**：所有 SQL 必须写 `"delete"`（带双引号），漏引号直接报 `no such column: delete`。

## 三种删除模式

`electron/ipc/trash.cjs` 的 `deleteNotes(nodeIds)` 读 `settings.deleteMode`：

| 模式 | 文件 | 数据库行 |
|---|---|---|
| `trash`（回收站） | `fs.renameSync` 到 `.delete/` | `UPDATE ... SET "delete"=1, last_up_time=now` |
| `systemTrash` | `shell.trashItem()`（系统回收站） | `DELETE` |
| `permanent` | `fs.unlinkSync()`（**不进**系统回收站） | `DELETE` |

模式只影响**后续**删除；已在回收站的条目不受切换影响 —— `listTrash` 永远返回全部 `"delete"=1`。

**回收站页面的「彻底删除」是独立入口**：`purgeTrashNodes(nodeIds)` —— **无条件**物理删除选中条目及其**整簇**
（顶层 + 其 `"delete"=1` 后代），不复用按 `settings.deleteMode` 分支的 `deleteNotes`。
不复用 `collectCluster` 之外的手写遍历，否则会在回收站留下孤儿。

## 删除簇与恢复（核心）

回收站**不额外标记**"这是整树删除还是单节点删除"，靠结构天然区分：

| 删除方式 | `"delete"` 标记 | 子节点 | `top` |
|---|---|---|---|
| 整树删除 | 该节点**及所有后代** = 1 | 后代也 = 1 | **不变** |
| 单节点删除 | **只有该节点** = 1 | 子节点改 `top` 到祖父，保持 0 | **不变** |

**回收站只列「簇顶层」**（`trash.cjs` 的 `listTrash`）：

```sql
SELECT n.id, n.name, n.last_up_time FROM notes n
WHERE n."delete" = 1
  AND NOT EXISTS (SELECT 1 FROM notes p WHERE p.id = n.top AND p."delete" = 1)
ORDER BY n.last_up_time DESC
```

**恢复 = 顶层 + 其所有 `"delete"=1` 后代**（BFS，`trashUtils.collectCluster`）：文件从 `.delete/` 移回，
标记 `"delete"=0`。

- 整树删除 → 顶层 = 子树根 → 恢复整树
- 单节点删除 → 顶层 = 该节点，无 `"delete"=1` 后代 → 恢复单节点

**根节点永不删除、永不进回收站**：删根 = 递归删其所有子孙，根保留为空根。
因为 MindMap 无活根时会用**硬编码 id `'1'`** 自动建根，软删根会撞主键；换新 id 又会产生第二个 `top='0'` 的根。
实现：`deleteEntireTree` 剔除 `top='0'`（UI 过滤用剔除后的 `restIds`），`trashUtils.filterDeletableIds` 二次防御。

## 保留期

- `settings.trashRetentionDays`（默认 30）。设置页仅在 `trash` 模式显示该输入框，
  但**清理逻辑始终运行**（对已存在的 `"delete"=1` 记录生效）。
- `purgeExpiredTrash()` 触发时机：**应用启动**（`electron/nodes/initNode.js`）与**保留期变更**（`electron/ipc/settings.cjs`）。
- 过期判定：`trashUtils.isExpired(lastUpTime, days, nowMs)` —— `days<=0` 或 `last_up_time` 为空时**不清理**。
  ISO 字符串可直接字典序比较。

## 为什么容易改坏

1. **`last_up_time` 一个字段两个语义**：正常时是"最近修改"，删除后是"删除时间"。
   任何"改数据不更新该字段"的路径都会让保留期算错。
   现行约束：删除后节点在回收站内不可编辑，除回收站外无其他入口 → 两语义不会同时生效。
2. **簇判定依赖 `top` 链**：删除**不改**被删节点的 `top`，恢复才能回到原位。
   若哪条路径顺手改了 `top`，恢复就会错位。
3. **查询过滤分散在两处**：web 侧 `Table`（`web/src/pages/db/db.js`，默认追加 `"delete" = 0`）与主进程 FTS
   （`electron/db/searchWorker.cjs`）。新增查询通道时容易漏掉过滤。
4. **文件与数据库行必须同步**：`deleteNotes` 把 DB 写放在**一个事务**里、文件操作在其之前；
   若中途失败，文件与行会不一致。
5. **回收站页面与删除模式解耦**：切模式不影响已有条目 —— 改代码时别把两者绑在一起。

## 禁忌

1. **不要软删根节点（`top='0'`）** —— 会与 MindMap 自动建根（硬编码 `id='1'`）撞主键或产生第二个根。
2. **不要给 `"delete"` 去掉双引号**。
3. **不要把文件操作放进 `better-sqlite3` 事务** —— 事务是同步的，`shell.trashItem` 是异步的。
4. **新增查询时不要忘记过滤 `"delete" = 0`**（`Table.select` 默认已加；确需包含已删用 `{ includeDeleted: true }`）。
5. **不要让 `purgeExpiredTrash` 绕过 `isExpired`**（它同时处理 `days<=0` 与 `last_up_time` 为空两种情况）。

## 常见修改速查

| 需求 | 改动点 |
|---|---|
| 改默认保留期 | `electron/common/settings.cjs` 的 `DEFAULT_SETTINGS.trashRetentionDays` + `Settings.jsx` 的兜底值 |
| 新增删除模式 | `trash.cjs` 的 `deleteNotes` 分支 + `settings.deleteMode` 联合类型 + 设置页按钮 + i18n |
| 改回收站列表字段 | `trash.cjs` 的 `listTrash` + `web/src/pages/trash/Trash.jsx` |
| 改回收站「彻底删除」 | `trash.cjs` 的 `purgeTrashNodes` + `Trash.jsx` 的选中/确认弹窗 |
| 改簇判定规则 | `electron/ipc/trashUtils.cjs`（纯函数，有单测）**且** `listTrash` 的 SQL 必须同步修改 |
| 改保留期清理语义 | `trashUtils.isExpired` + 单测 |

## 调试探针

不启动 App，直接查 DB（注意迁移可能还在 WAL 里）：

```bash
ELECTRON_RUN_AS_NODE=1 ./electron/node_modules/.bin/electron -e "
const D=require('./node_modules/better-sqlite3');
const p=process.env.HOME+'/Documents/notes/.data';
const d=new D(p,{readonly:true});
console.log('cols:', d.prepare('PRAGMA table_info(notes)').all().map(c=>c.name).join(','));
console.log('deleted:', d.prepare('SELECT COUNT(*) c FROM notes WHERE \"delete\"=1').get().c);
console.log(d.prepare('SELECT id,name,top,last_up_time FROM notes WHERE \"delete\"=1').all());
"
```

单测（纯逻辑，无需 Electron runtime）：

```bash
node --test electron/ipc/trashUtils.test.cjs
ELECTRON_RUN_AS_NODE=1 ./electron/node_modules/.bin/electron --test electron/db/schema.test.cjs
```

## 修复历史

- **2026-09-16**：新增回收站多选「彻底删除」（`purgeTrashNodes`，整簇物理删除，带警告确认）。
- **2026-09-15**：首次实现 —— 删除簇判定、整簇恢复、三种删除模式、可配置保留期、全局查询过滤；
  移除旧 `deleted_notes` 表与"只写不读"的旧软删除逻辑。
  同日修复：删除改回乐观 UI；写库合并为单事务、`getTrashDir` 移出循环。
