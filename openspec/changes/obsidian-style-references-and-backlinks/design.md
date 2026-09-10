# Design

## 格式三态（解析 ↔ 序列化往返无损）

| 存储格式 | 解析结果 | 显示 | 序列化 |
|---|---|---|---|
| `[[id]]` 新默认 | `{id: X, name: X}` | `target?.name`（动态） | `[[id]]` |
| `[[id|别名]]` | `{id: X, name: 别名}` | `target?.name`（别名仅失效兜底） | `[[id|别名]]` |
| `[[旧名]]` 遗留 | `{id: X, name: X}` | id 不匹配 → 缺失样式（显示输入文本） | 原样 |

- 序列化：`id && name && name !== id` → `[[id|name]]`；`id` → `[[id]]`；仅 name → `[[name]]`
- 显示：`target?.name || name || id`
- 解析（resolveInternalNodeTarget）：无 id → undefined；有 id → `nodes.find(n => n.id === id)`
- 图片判定：`embed && reference.id === reference.name && isImageReference(name)`（无管道哨兵，替代旧 `!reference.id`）

## 反链查询

`SELECT id, name FROM notes WHERE id != ? AND (content LIKE '%[[{id}|%' OR content LIKE '%[[{id}]]%' ESCAPE '\\')`——每笔记一行天然去重，排除自引用。

## 布局约束

遵循 EDITOR_LAYOUT.md：Node.jsx 第 6 层拆纵向 flex，第 7 层滚动容器与第 9 层 .ProseMirror 不动。

## 权衡（已确认）

- 不做重命名改写：接受 markdown/FTS 中旧格式名称残留（搜索/导出可能见过时名）
- 手写 `[[笔记名]]` 不再按名称解析（缺失样式）
- id-only 引用目标被删后显示裸 id（诚实可辨识）
