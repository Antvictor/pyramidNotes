# Fix Ctrl+N Shortcut When No Node Selected

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix Ctrl+N shortcut so it works when no node is selected, creating a new node under the root node (id="1").

**Architecture:** Move the `!shortcuts` guard to the top level (as already done), but remove `!selectedNode` check from the common guard. Instead, add individual guards to F2 and Delete shortcuts which require a selected node.

**Tech Stack:** React, xyflow/react

---

## File Structure

- `web/src/pages/MindMap.jsx` - Modify the shortcut handler logic

---

## Task 1: Fix shortcut handler to allow Ctrl+N without selection

**Files:**
- Modify: `web/src/pages/MindMap.jsx:151-175`

- [ ] **Step 1: Read current code (lines 148-175)**

Current code has a guard at line 152 that returns early if `!selectedNode || !shortcuts`. This prevents Ctrl+N from working when no node is selected.

- [ ] **Step 2: Change line 152 from `if (!selectedNode || !shortcuts) return;` to `if (!shortcuts) return;`**

```javascript
// Before (line 152):
if (!selectedNode || !shortcuts) return;

// After (line 152):
if (!shortcuts) return;
```

- [ ] **Step 3: Add `if (!selectedNode) return;` guard before F2 handler (before line 160)**

After removing the common guard, we need to add specific guards for shortcuts that require a selected node:

```javascript
// Ctrl+N - 新建节点 (no guard needed - works without selection)
if (matchKey(shortcuts.node?.newNode, e)) {
  e.preventDefault();
  requestCreateNode(selectedNode?.id || "1");
  return;
}
// F2 - 修改节点 (requires selection)
if (!selectedNode) return;  // ADD THIS GUARD
if (matchKey(shortcuts.node?.renameNode, e)) {
  e.preventDefault();
  requestEditNode(selectedNode.id, selectedNode.name);
  return;
}
// Delete - 删除节点 (requires selection)
if (!selectedNode) return;  // ADD THIS GUARD
if (matchKey(shortcuts.node?.deleteNode, e)) {
  e.preventDefault();
  requestDeleteNode(selectedNode.id, selectedNode.name);
  return;
}
```

- [ ] **Step 4: Verify server is running**

Run: `curl -s http://localhost:5173 > /dev/null && echo "Server OK" || echo "Server not running"`
Expected: Server OK

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/MindMap.jsx
git commit -m "fix: Ctrl+N works when no node selected"
```

---

## Verification

- [ ] No node selected, press Ctrl+N → dialog opens, enter name → node created under root
- [ ] Node selected, press Ctrl+N → dialog opens, enter name → node created as child of selected
- [ ] No node selected, press F2 → nothing happens (correct, F2 requires selection)
- [ ] Node selected, press F2 → dialog opens with current name
- [ ] No node selected, press Delete → nothing happens (correct, Delete requires selection)
- [ ] Node selected, press Delete → delete dialog shows if has children, or deletes directly

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-31-fix-ctrl-n-no-selection.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?