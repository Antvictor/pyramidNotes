# Bug Fix Discussion - Technical Design

## Context

This change serves as a discussion container for multiple bugs. The bugs involve:
1. **Database API errors** - `db.notes.count is not a function`
2. **State management issues** - selection state not updating or being lost
3. **Keyboard shortcut logic** - shortcuts not triggering correctly

**Current state**: The application uses a SQLite database accessed via a `db` object with methods like `db.notes.select()`, `db.notes.insert()`, `db.notes.delete()`, `db.notes.update()`.

**Key files**:
- `web/src/pages/MindMap.jsx` - Main component with node operations
- `web/src/db/db.js` - Database abstraction layer
- `web/src/pages/note/ContextMenu/ContextMenu.jsx` - Right-click menu

## Goals / Non-Goals

**Goals:**
- Fix Bug 2 & 3: `db.notes.count is not a function` error
- Fix Bug 4: F2 rename dialog not showing latest name
- Fix Bug 5: Selection state being lost after operations

**Non-Goals:**
- This change does not implement fixes - it documents discussion
- Each bug will be fixed in its own sub-change after discussion

## Decisions

### Decision 1: Bug discussion structure

**Decision**: Keep all bug discussions in one change for easy reference, but create separate sub-changes for each fix.

**Rationale**: Bugs are related (some share the same root cause) but fixing them involves different code changes. Grouping discussions makes it easy to see the full picture, while sub-changes keep each fix focused.

### Decision 2: Database API investigation needed

**Decision**: Before fixing Bugs 2 & 3, investigate the correct way to get the count of records in `db.notes`.

**Rationale**: The error `db.notes.count is not a function` suggests either:
- The `count()` method doesn't exist on the db.notes object
- The method signature is different from what's being used

**Current code (MindMap.jsx:250)**:
```javascript
const childCount = db.notes.count().where({ top: nodeId }).run();
```

This follows a query-builder pattern, but the actual `db` implementation may use a different API.

### Decision 3: State management investigation needed

**Decision**: For Bugs 4 & 5, investigate how `selectedNode` state is managed and updated.

**Rationale**: Bug 4 shows that `selectedNode.name` isn't reflecting the latest name after edit. Bug 5 shows selection being lost. Both suggest state synchronization issues.

**Current flow**:
1. User selects node → `setSelectedNode({ id, name })`
2. User presses F2 → `updateNode(id, name)` opens dialog with `title` state
3. User edits → `editNode` updates db and `setNotesData`
4. But `selectedNode` is never updated after edit

## Risks / Trade-offs

**[Risk]**: Changing `db.notes` API might break other parts of the application
→ **Mitigation**: Check all usages of `db.notes` before making changes

**[Risk]**: State management fix might be complex due to React flow
→ **Mitigation**: Focus on minimal changes - just sync `selectedNode` when node data changes

## Open Questions

1. **Bug 2 & 3**: What is the correct syntax for `db.notes.count()`? Need to check `web/src/db/db.js` implementation.

2. **Bug 4**: After `editNode` updates the database, should `setSelectedNode` be called to update the selected node's name?

3. **Bug 5**: After `insertNode` (create), should the new node be auto-selected?

## Investigation Tasks

For each bug, we need to:
1. Identify root cause by reading relevant code
2. Discuss the fix approach
3. Document the agreed fix
4. Create a sub-change for implementation

---

## Bug-Specific Analysis

### Bug 2 & 3: `db.notes.count is not a function`

**Root cause hypothesis**: The `db` object uses a different query method. The `select()` method returns all records, so getting a count would need `select().then(res => res.length)` or similar.

**Files to investigate**:
- `web/src/db/db.js` - understand the actual API

### Bug 4: F2 rename dialog not showing latest name

**Root cause hypothesis**: When `updateNode` is called (F2), it sets `setTitle(title)` where `title` is the old name. After `editNode` completes, `selectedNode` still has the old name, so the next F2 press uses the stale `selectedNode.name`.

**Fix approach**: After `editNode` completes successfully, update `setSelectedNode` with the new name.

### Bug 5: Selection state being lost

**Root cause hypothesis**: Several places call `clearSelectedNode()`:
- `confirmDelete` (line 254)
- `DeleteNodeDialog` callbacks (lines 575, 582)
- `onPaneClick` (line 532)

Need to check which ones are unintentionally clearing selection.

**Fix approach**: Review all `clearSelectedNode()` calls and ensure they only trigger when user действительно wants to deselect.