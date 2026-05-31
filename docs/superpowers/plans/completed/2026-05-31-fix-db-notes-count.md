# Fix db.notes.count is not a function Error

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix `db.notes.count is not a function` error by adding a count method to the Table class and updating the caller in MindMap.jsx.

**Architecture:** Add a `count(whereClause)` method to the Table class in db.js that queries records matching the where clause and returns the count. Update requestDeleteNode in MindMap.jsx to use this new method.

**Tech Stack:** React, SQLite (via window.api.dbQuery)

---

## File Structure

- `web/src/pages/db/db.js` - Add count method to Table class
- `web/src/pages/MindMap.jsx` - Update requestDeleteNode to use db.notes.count()

---

## Task 1: Add count method to Table class

**Files:**
- Modify: `web/src/pages/db/db.js`

- [ ] **Step 1: Read current Table class (lines 1-48)**

Note the existing `select` method at lines 15-29 uses a similar pattern with whereClause.

- [ ] **Step 2: Add count method after select method (after line 29)**

```javascript
async count(whereClause = {}) {
    const results = await this.select(whereClause);
    return results.length;
}
```

- [ ] **Step 3: Verify server is running**

Run: `curl -s http://localhost:5173 > /dev/null && echo "Server OK" || echo "Server not running"`
Expected: Server OK

- [ ] **Step 4: Commit**

```bash
git add web/src/pages/db/db.js
git commit -m "feat: add count method to Table class"
```

---

## Task 2: Update requestDeleteNode to use db.notes.count()

**Files:**
- Modify: `web/src/pages/MindMap.jsx:248-257`

- [ ] **Step 1: Read current requestDeleteNode implementation**

```javascript
const requestDeleteNode = (nodeId, nodeName) => {
  const childCount = db.notes.count().where({ top: nodeId }).run();  // WRONG
  if (childCount === 0) {
    _internalDeleteNode(nodeId, nodeName);
  } else {
    const currentNode = db.notes.select().where({ id: nodeId }).run()[0];  // WRONG
    setDeleteTarget({ id: nodeId, name: nodeName, childCount, grandParentId: currentNode?.top || null });
  }
};
```

Note: `db.notes.select().where().run()` is also wrong - select() takes an object directly, not chainable.

- [ ] **Step 2: Fix requestDeleteNode to use correct API**

```javascript
const requestDeleteNode = async (nodeId, nodeName) => {
  const childCount = await db.notes.count({ top: nodeId });
  if (childCount === 0) {
    _internalDeleteNode(nodeId, nodeName);
  } else {
    const currentNode = (await db.notes.select({ id: nodeId }))[0];
    setDeleteTarget({ id: nodeId, name: nodeName, childCount, grandParentId: currentNode?.top || null });
  }
};
```

Changes:
- Added `async` keyword since db.notes.count() is now async
- Changed `db.notes.count().where().run()` to `await db.notes.count({ top: nodeId })`
- Changed `db.notes.select().where().run()[0]` to `(await db.notes.select({ id: nodeId }))[0]`

- [ ] **Step 3: Verify server is running**

Run: `curl -s http://localhost:5173 > /dev/null && echo "Server OK" || echo "Server not running"`
Expected: Server OK

- [ ] **Step 4: Commit**

```bash
git add web/src/pages/MindMap.jsx
git commit -m "fix: use db.notes.count() and fix select API usage"
```

---

## Verification

- [ ] Press Delete key on a node with children → DeleteNodeDialog appears
- [ ] Press Delete key on a node without children → node deleted directly
- [ ] Right-click delete on a node with children → DeleteNodeDialog appears
- [ ] Right-click delete on a node without children → node deleted directly
- [ ] No console errors about `count is not a function`

---

**Plan complete and saved to `docs/superpowers/plans/2026-05-31-fix-db-notes-count.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?