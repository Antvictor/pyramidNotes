## Why

用户报告：把「符合规则」的 `.md` 文件放进存储目录后，**无论重启 App 还是重选存储目录都加载不到新文件**。

排查后发现扫描其实一直在执行（`electron/nodes/initNode.js` 的插入路径确凿跑过——用户库里 54/55 行的 `content` 是「整份文件含 `---` frontmatter」，只有该路径会产出这种脏数据），真正的问题有两类：

1. **写入侧类型失真**：用户新增的 `zbysv-KrUE3M-t.md` 里 `top: 1` 不带引号，YAML 解析成 JS number，`initNode` 原样绑定进 TEXT 列，SQLite 做 REAL→TEXT 转换存成 `'1.0'`。没有任何节点 id 是 `'1.0'`，该节点连同 5 个子节点全部吊空——渲染侧只从 root 可达，吊空节点被过滤掉，**完全不可见**。同理 `parsed.data.top || null` 把合法的 `0`、`''` 抹成 NULL（`top: 0` 的根文件连 `isRoot()` 都判不出来）。
2. **反向对账整体缺失**：`DB 有行 / 目录无文件 → 删除` 曾在 `1d7a9bd` 实现，被 `6ba7a24`（"drop legacy soft-delete path"）删除后再未补回。用户库里已积累 10 行吊空（1 行 `top='1.0'`，9 行指向上一代 DB 的旧 id）。

此外 `content` 存了带 frontmatter 的整份原文，污染 FTS 检索、搜索摘要与反链搜索；无 `id` 的 frontmatter 被静默丢弃。

## What Changes

- `initNode` 从「只做单向插入」改为「扫目录 → 与 SQL 双向对账」：新增、修复、恢复、硬删、父节点重挂一次算清，单事务落库。
- 新增 `electron/nodes/noteSync.cjs`（纯函数，不依赖 electron / better-sqlite3）承载全部对账逻辑，配套 `node:test` 单测。
- frontmatter 字段统一规整为字符串（`undefined | null | '' → null`，其余 `String(v)`），在写入层收敛，不再依赖渲染侧的严格字符串比较做兜底。
- 目录里 0 个 `.md` 时跳过删除阶段，避免存储盘未挂载 / iCloud 半同步时清库。
- 修 `electron/ipc/file.cjs` 中 `openFile` 用 `fileName.split('-')[0]` 反推 id 的缺陷——id 自身可能含 `-`（`zbysv-KrUE3M`、`Fe-9MDeqq4oD`），该兜底对这类节点必然失效。

## Capabilities

### New Capabilities
- `note-storage-sync`: 定义存储目录顶层 `.md` 与 SQLite `notes` 表之间的双向对账契约，包括字段规整规则、增删改恢复判定、根节点保护与目录为空的守门条件。

### Modified Capabilities
- None.

## Impact

- 受影响的代码：
  - `electron/nodes/noteSync.cjs`（新增）
  - `electron/nodes/noteSync.test.cjs`（新增）
  - `electron/nodes/initNode.js`（重写对账部分）
  - `electron/ipc/file.cjs`（`openFile` 的文件缺失兜底）
- 调用点不变：`electron/main.cjs:30`（启动）、`electron/main.cjs:51`（reloadDatabase）、`electron/ipc/settings.cjs:45`（切目录），三处均已 `await`。
- 数据影响：首次启动会修复既有脏数据（`top='1.0'` → `'1'`、`content` 去 frontmatter、`left` 归一），并删除目录中已不存在的笔记行。
- 不涉及渲染侧与数据库 schema 变更。
