# Unify Node Operations (Create/Edit/Delete)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify all three node operations (create, edit, delete) so that keyboard shortcuts and right-click context menu call the same logic. Shortcuts use selectedNode?.id || "1" as parentId - no separate "empty area" shortcut needed.

**Architecture:** Add unified `request*` wrapper methods in MindMap.jsx that handle permission checks before calling internal operations. Shortcuts pass parentId as `selectedNode?.id || "1"` so the same shortcut works for both selected and unselected states.

**Tech Stack:** React, xyflow/react, SQLite (via db.notes)

---

## File Structure

- `web/src/pages/MindMap.jsx` - Add unified request* methods, fix shortcut parentId fallback
- `web/src/pages/note/ContextMenu/ContextMenu.jsx` - Wire to unified request* methods
- `web/src/hooks/useShortcuts.js` - No changes needed (already calls MindMap callbacks)

---

## Task 1: Fix Ctrl+N to handle unselected state + Add unified requestDeleteNode

**Files:**
- Modify: `web/src/pages/MindMap.jsx:155-158` (Ctrl+N handler)
- Modify: `web/src/pages/MindMap.jsx:166-177` (Delete handler - already uses setDeleteTarget, just needs refactor to request* pattern)
- Modify: `web/src/pages/MindMap.jsx:240-248` (add handleContextMenuDelete after deleteNode)

- [ ] **Step 1: Read current delete handling code (lines 166-177)**

Current Delete shortcut already checks childCount and uses setDeleteTarget for dialog. This is the reference pattern.

- [ ] **Step 2: Fix Ctrl+N to pass selectedNode?.id || "1"**

Change MindMap.jsx lines ~155-158:
```javascript
// From:
if (matchKey(shortcuts.node?.newNode, e)) {
  e.preventDefault();
  addNewNode(selectedNode.id);
  return;
}

// To:
if (matchKey(shortcuts.node?.newNode, e)) {
  e.preventDefault();
  addNewNode(selectedNode?.id || "1");  // Use root "1" if no node selected
  return;
}
```

- [ ] **Step 3: Add unified requestDeleteNode wrapper (after deleteNode ~line 240)**

```javascript
// ========== Unified Request Methods ==========
// All shortcuts and context menu call these instead of direct operation functions
// This ensures consistent behavior and permission checks

// Request delete node - unified entry point with child count check
const requestDeleteNode = (nodeId, nodeName) => {
  const childCount = db.notes.count().where({ top: nodeId }).run();
  if (childCount === 0) {
    deleteNode(nodeId, nodeName);
  } else {
    const currentNode = db.notes.select().where({ id: nodeId }).run()[0];
    setDeleteTarget({ id: nodeId, name: nodeName, childCount, grandParentId: currentNode?.top || null });
  }
};
```

- [ ] **Step 4: Verify server is running**

Run: `curl -s http://localhost:5173 > /dev/null && echo "Server OK" || echo "Server not running"`
Expected: Server OK

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/MindMap.jsx
git commit -m "fix: Ctrl+N works when no node selected, add unified requestDeleteNode"
```

---

## Task 2: Add unified requestCreateNode and requestEditNode

**Files:**
- Modify: `web/src/pages/MindMap.jsx:240-248` (add after requestDeleteNode)

- [ ] **Step 1: Add requestCreateNode and requestEditNode**

After requestDeleteNode (around line 250), add:

```javascript
// Request create node - unified entry point (same logic for shortcut and right-click)
const requestCreateNode = (parentId, prefillName) => {
  addNewNode(parentId, prefillName);
};

// Request edit node - unified entry point
const requestEditNode = (nodeId, nodeName) => {
  updateNode(nodeId, nodeName);
};
```

Note: `addNewNode` already accepts optional second param for prefillName (see line 407).

- [ ] **Step 2: Verify no other changes needed**

Check that requestCreateNode and requestEditNode simply delegate to existing addNewNode/updateNode.

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/MindMap.jsx
git commit -m "feat: add unified requestCreateNode and requestEditNode"
```

---

## Task 3: Update ContextMenu to use unified request* methods

**Files:**
- Modify: `web/src/pages/note/ContextMenu/ContextMenu.jsx:5,19,26,29,32`
- Modify: `web/src/pages/MindMap.jsx:548-553`

- [ ] **Step 1: Update ContextMenu.jsx props**

Change line 5:
```javascript
// From:
const ContextMenu = ({ menu, onClose, onCreateNode, onEditNode, onDeleteNode }) => {

// To:
const ContextMenu = ({ menu, onClose, requestCreateNode, requestEditNode, requestDeleteNode }) => {
```

- [ ] **Step 2: Update ContextMenu click handlers**

```javascript
// Line 19: onCreateNode -> requestCreateNode
<div className="menu-item" onClick={() => { requestCreateNode(menu.nodeId); onClose(); }}>

// Line 26: onCreateNode with prefillName -> requestCreateNode
<div className="menu-item" onClick={() => { requestCreateNode(menu.nodeId, menu.title); onClose(); }}>

// Line 29: onEditNode -> requestEditNode
<div className="menu-item" onClick={() => { requestEditNode(menu.nodeId, menu.title); onClose(); }}>

// Line 32: onDeleteNode -> requestDeleteNode
<div className="menu-item" onClick={() => { requestDeleteNode(menu.nodeId, menu.title); onClose(); }}>
```

- [ ] **Step 3: Update MindMap.jsx ContextMenu props (lines ~548-553)**

```javascript
// From:
onCreateNode={addNewNode}
onEditNode={updateNode}
onDeleteNode={deleteNode}

// To:
requestCreateNode={requestCreateNode}
requestEditNode={requestEditNode}
requestDeleteNode={requestDeleteNode}
```

- [ ] **Step 4: Test - right-click on node and verify all options work**

Expected: Right-click Create/Edit/Delete all trigger the same logic as keyboard shortcuts

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/note/ContextMenu/ContextMenu.jsx web/src/pages/MindMap.jsx
git commit -m "refactor: wire ContextMenu to unified request* methods"
```

---

## Task 4: Update useShortcuts hook callbacks to use unified request* methods

**Files:**
- Modify: `web/src/pages/MindMap.jsx:580-600` (useShortcuts call)

- [ ] **Step 1: Update useShortcuts props to use unified request* methods**

Around line 580, find the useShortcuts call and change:
```javascript
// From:
useShortcuts({
  onNewNode: (id) => addNewNode(id),
  onRenameNode: (id, name) => updateNode(id, name),
  onDeleteNode: () => {/* inline delete logic with childCount check */},
  // ...
});

// To:
useShortcuts({
  onNewNode: (id) => requestCreateNode(id),
  onRenameNode: (id, name) => requestEditNode(id, name),
  onDeleteNode: () => requestDeleteNode(selectedNode.id, selectedNode.name),
  // ...
});
```

- [ ] **Step 2: Verify useShortcuts hook needs no changes**

The hook just calls the callbacks passed to it - no changes needed in the hook itself.

- [ ] **Step 3: Test - press Ctrl+N, F2, Delete with and without selected node**

Expected:
- Ctrl+N without selection -> creates root node
- Ctrl+N with selection -> creates child of selected node
- F2 with selection -> edits selected node
- Delete with selection -> shows DeleteNodeDialog if has children, else deletes directly

- [ ] **Step 4: Commit**

```bash
git add web/src/pages/MindMap.jsx
git commit -m "refactor: hook shortcuts to unified request* methods"
```

---

## Task 5: Rename internal methods to clarify they are internal

**Files:**
- Modify: `web/src/pages/MindMap.jsx`

- [ ] **Step 1: Rename internal functions to _internal* prefix**

```javascript
// Rename in MindMap.jsx:
addNewNode -> _internalAddNode
updateNode -> _internalUpdateNode
deleteNode -> _internalDeleteNode

// Keep requestCreateNode, requestEditNode, requestDeleteNode as public entry points
```

- [ ] **Step 2: Update all internal references**

Search for addNewNode, updateNode, deleteNode and ensure all calls go through request* wrappers except:
- OpenPrompt's onOk callback (line 559: `onOk={nodeAction}`)
- The request* methods themselves

- [ ] **Step 3: Verify build passes**

Run: `curl -s http://localhost:5173 > /dev/null && echo "Build OK" || echo "Build failed"`
Expected: Build OK

- [ ] **Step 4: Commit**

```bash
git add web/src/pages/MindMap.jsx
git commit -m "refactor: rename internal methods to _internal* prefix"
```

---

## Verification

- [ ] Ctrl+N without selection creates root node
- [ ] Ctrl+N with selection creates child node
- [ ] Right-click Create node works
- [ ] F2 with selection edits node
- [ ] Right-click Edit node works
- [ ] Delete with children shows DeleteNodeDialog
- [ ] Delete without children directly deletes
- [ ] Right-click Delete works
- [ ] No console errors

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-31-unify-node-operations.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?