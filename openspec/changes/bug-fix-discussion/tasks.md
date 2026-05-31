# Bug Fix Discussion - Tasks

This change is for bug discussion only. Each bug will be fixed in a separate sub-change after discussion.

## 1. Bug Investigation

### Bug 1: Ctrl+N 快捷键无选中节点没反应
- [x] 1.1 已在之前的 PR 中修复 (commit dc81311)

### Bug 2 & 3: Delete 和右键删除报错 `db.notes.count is not a function`
- [ ] 1.2 检查 `web/src/db/db.js` 了解正确的 count API
- [ ] 1.3 讨论修复方案
- [ ] 1.4 创建 sub-change `fix-delete-shortcut-db-error`
- [ ] 1.5 实现修复

### Bug 4: F2 修改节点名称没有实时更新
- [ ] 1.6 检查 `selectedNode` 状态管理逻辑
- [ ] 1.7 讨论如何同步 `selectedNode` 和实际节点名称
- [ ] 1.8 创建 sub-change `fix-f2-name-refresh`
- [ ] 1.9 实现修复

### Bug 5: 修改后会取消选中状态
- [ ] 1.10 检查所有 `clearSelectedNode()` 调用点
- [ ] 1.11 讨论哪些调用是不应该的
- [ ] 1.12 创建 sub-change `fix-selection-state-retention`
- [ ] 1.13 实现修复

## 2. Database API Investigation

- [ ] 2.1 阅读 `web/src/db/db.js` 了解 db.notes API
- [ ] 2.2 确定正确的 count 方法或替代方案
- [ ] 2.3 更新 Bug 2 & 3 的修复方案

## 3. Sub-changes Created

| Bug | Sub-change Name | Status |
|-----|-----------------|--------|
| Bug 1 | N/A | ✅ 已修复 |
| Bug 2 & 3 | `fix-delete-shortcut-db-error` | Todo |
| Bug 4 | `fix-f2-name-refresh` | Todo |
| Bug 5 | `fix-selection-state-retention` | Todo |

---

## How to Use This Document

1. **Investigate**: For each bug, read the relevant code to understand the root cause
2. **Discuss**: Once investigation is complete, discuss the fix approach
3. **Create sub-change**: After discussion, create a separate sub-change for implementation
4. **Implement**: Use `/opsx:apply <sub-change-name>` to implement the fix
5. **Mark complete**: Update this document when sub-change is complete