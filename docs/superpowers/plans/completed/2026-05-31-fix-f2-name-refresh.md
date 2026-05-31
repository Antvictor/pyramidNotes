# Fix F2 Rename Dialog Not Showing Latest Name

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix F2 rename shortcut so it always shows the node's current name, not the stale name from when the node was first selected.

**Architecture:** After `editNode` successfully updates the database and notesData, also update the selectedNode state by calling setSelectedNode with the new name.

**Tech Stack:** React, xyflow/react

---

## File Structure

- `web/src/pages/MindMap.jsx` - Update editNode callback to sync selectedNode

---

## Task 1: Sync selectedNode after editNode completes

**Files:**
- Modify: `web/src/pages/MindMap.jsx:466-481`

- [ ] **Step 1: Read current editNode implementation (lines 466-481)**

```javascript
const editNode = useCallback(
  async (id, name, orginName) => {
    console.log("editNode id:", id, "name:", name, "orginName:", orginName);
    setVisible(false);
    db.notes.update({ id: id }, { name: name });
    setNotesData(nds => nds.map(n => n.id === id ? { ...n, name: name } : n));
    // 修改文件名称
    const renameResult = await window.api.renameFile(`${id}-${orginName}.md`, `${id}-${name}.md`);
    if (handleFileError(renameResult)) return;

    const yamlResult = await window.api.updateYaml(`${id}-${name}.md`, { title: name });
    if (handleFileError(yamlResult)) return;
  },
  [setNotesData]
);
```

Note: After successful update, only `notesData` is updated, not `selectedNode`.

- [ ] **Step 2: Add setSelectedNode call after successful update**

Add `setSelectedNode` to the dependencies and call it after both renameResult and yamlResult succeed:

```javascript
const editNode = useCallback(
  async (id, name, orginName) => {
    console.log("editNode id:", id, "name:", name, "orginName:", orginName);
    setVisible(false);
    db.notes.update({ id: id }, { name: name });
    setNotesData(nds => nds.map(n => n.id === id ? { ...n, name: name } : n));
    // 修改文件名称
    const renameResult = await window.api.renameFile(`${id}-${orginName}.md`, `${id}-${name}.md`);
    if (handleFileError(renameResult)) return;

    const yamlResult = await window.api.updateYaml(`${id}-${name}.md`, { title: name });
    if (handleFileError(yamlResult)) return;

    // Sync selectedNode with updated name
    setSelectedNode({ id, name });
  },
  [setNotesData, setSelectedNode]
);
```

**Important**: `setSelectedNode` is passed as a prop to MindMap (line 131), so it must be in the dependency array.

- [ ] **Step 3: Verify server is running**

Run: `curl -s http://localhost:5173 > /dev/null && echo "Server OK" || echo "Server not running"`
Expected: Server OK

- [ ] **Step 4: Commit**

```bash
git add web/src/pages/MindMap.jsx
git commit -m "fix: sync selectedNode after editNode to show latest name"
```

---

## Verification

- [ ] Select node A (name="OldName")
- [ ] Press F2 → dialog shows "OldName"
- [ ] Change name to "NewName" and confirm
- [ ] Press F2 again → dialog shows "NewName" (not "OldName")
- [ ] Right-click node → select "修改节点" → dialog shows current name
- [ ] After edit, selected node still selected and shows updated name

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-31-fix-f2-name-refresh.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?