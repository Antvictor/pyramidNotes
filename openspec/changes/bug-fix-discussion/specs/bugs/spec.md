# Bug Fix Specifications

This file documents the bug requirements to be fixed. Each bug will be addressed in a separate sub-change.

## Bug 1: Ctrl+N 快捷键在无选中节点时没反应

### Requirement: Ctrl+N 创建根节点

当没有选中任何节点时，按 Ctrl+N 快捷键 SHALL 在根节点下创建一个新节点。

**Status**: ✅ 已修复 (commit dc81311 - `selectedNode?.id || "1"`)

---

## Bug 2 & 3: Delete 和右键删除报错 `db.notes.count is not a function`

### Requirement: 删除节点前检查子节点数量

系统 SHALL 在删除节点前检查该节点是否有子节点。如有子节点，SHALL 弹出删除确认对话框。

**Root cause**: `db.notes.count()` 方法不存在于数据库 API

#### Scenario: 删除有子节点的节点
- **WHEN** 用户按 Delete 键或右键删除有子节点的节点
- **THEN** 系统显示删除确认对话框，让用户选择删除方式（删除整个子树 或 仅删除父节点）

#### Scenario: 删除无子节点的节点
- **WHEN** 用户按 Delete 键或右键删除无子节点的节点
- **THEN** 系统直接删除该节点，不弹出确认对话框

#### Scenario: 右键删除与快捷键删除行为一致
- **WHEN** 用户使用 Delete 快捷键删除节点
- **AND** 用户使用右键菜单删除节点
- **THEN** 两种方式的删除逻辑完全相同

---

## Bug 4: F2 修改节点名称没有实时更新

### Requirement: 修改对话框显示最新节点名称

每次打开节点修改对话框，SHALL 显示该节点当前的最新名称，而非缓存的旧名称。

#### Scenario: F2 快捷键修改节点
- **WHEN** 用户选中节点 A，按 F2 打开修改对话框
- **AND** 用户输入新名称并确认
- **THEN** 系统更新节点名称，并保持节点 A 为选中状态
- **AND** 用户再次按 F2 时，对话框中显示的是新名称

#### Scenario: 右键修改节点
- **WHEN** 用户右键节点 A，选择"修改节点"
- **AND** 用户输入新名称并确认
- **THEN** 系统更新节点名称，并保持节点 A 为选中状态

---

## Bug 5: 修改后会取消选中状态

### Requirement: 操作后保持选中状态

节点操作（创建子节点、修改节点）完成后，系统 SHALL 保持该节点为选中状态。只有用户主动点击空白区域或选择其他节点时才取消选中。

#### Scenario: 创建子节点后保持选中
- **WHEN** 用户选中节点 A，按 Ctrl+N 创建子节点
- **AND** 用户输入子节点名称并确认
- **THEN** 节点 A 保持选中状态，子节点 B 被创建为 A 的子节点

#### Scenario: 修改节点后保持选中
- **WHEN** 用户选中节点 A，按 F2 修改节点名称
- **AND** 用户输入新名称并确认
- **THEN** 节点 A 保持选中状态，显示新名称

#### Scenario: 点击空白区域取消选中
- **WHEN** 用户在画布空白区域点击
- **THEN** 当前选中节点被取消选中状态

---

## Investigation Notes

### db.notes API 检查

根据错误 `db.notes.count is not a function`，需要检查 `web/src/db/db.js` 中的实际 API。

可能的正确用法：
- `db.notes.select().where({ top: nodeId }).run()` 返回数组
- 计数应该是 `db.notes.select().where({ top: nodeId }).run().then(res => res.length)`
- 或类似 `db.notes.count({ top: nodeId })` 的同步方法

### 状态同步检查

Bug 4 和 Bug 5 的根因可能是：
1. `selectedNode` 在 `editNode` 后没有更新
2. `clearSelectedNode()` 在不应该的地方被调用