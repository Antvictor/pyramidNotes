# delete-node-with-children Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 增强删除节点逻辑：空节点直接删除，有子节点的节点弹出对话框让用户选择删除方式

**Architecture:** 在 `MindMap.jsx` 的 `deleteNode` 函数中检测是否有子节点，有子节点时显示新的选择对话框。复用现有 `ConfirmDialog` 或创建新的 `DeleteNodeDialog` 组件。

**Tech Stack:** React, SQLite (db.notes), Electron IPC, Radix Dialog

---

## File Structure

```
web/src/
├── pages/MindMap.jsx                    # 修改 deleteNode 函数，添加子节点检测
├── components/ui/confirm-dialog.tsx      # 复用现有 ConfirmDialog
└── components/ui/delete-node-dialog.tsx  # 新建：DeleteNodeDialog（带单选选项的对话框）
```

---

## 1. 创建 DeleteNodeDialog 组件

### Task 1: 创建 DeleteNodeDialog 组件

**Files:**
- Create: `web/src/components/ui/delete-node-dialog.tsx`

- [ ] **Step 1: 创建 DeleteNodeDialog 组件文件**

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export function DeleteNodeDialog({
  open,
  onOpenChange,
  nodeName,
  childCount,
  onDeleteEntireTree,
  onDeleteParentOnly,
  onCancel,
}) {
  const [selectedOption, setSelectedOption] = useState("parent-only") // 默认选择"仅删除父节点"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>确认删除节点</DialogTitle>
          <DialogDescription>
            节点 "{nodeName}" 包含 {childCount} 个子节点，请选择删除方式：
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="deleteOption"
              value="entire-tree"
              checked={selectedOption === "entire-tree"}
              onChange={() => setSelectedOption("entire-tree")}
              className="mt-1"
            />
            <div>
              <div className="font-medium">删除整个子树</div>
              <div className="text-sm text-muted-foreground">
                删除 "{nodeName}" 及其所有子节点，此操作不可撤销
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="deleteOption"
              value="parent-only"
              checked={selectedOption === "parent-only"}
              onChange={() => setSelectedOption("parent-only")}
              className="mt-1"
            />
            <div>
              <div className="font-medium">仅删除 "{nodeName}"</div>
              <div className="text-sm text-muted-foreground">
                子节点将提升到上一级
              </div>
            </div>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button
            variant={selectedOption === "entire-tree" ? "destructive" : "default"}
            onClick={() => {
              if (selectedOption === "entire-tree") {
                onDeleteEntireTree?.()
              } else {
                onDeleteParentOnly?.()
              }
            }}
          >
            确认
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DeleteNodeDialog
```

- [ ] **Step 2: 提交**

```bash
git add web/src/components/ui/delete-node-dialog.tsx
git commit -m "feat: add DeleteNodeDialog component for delete options"
```

---

## 2. 修改 MindMap.jsx 删除逻辑

### Task 2: 修改 deleteNode 函数，添加子节点检测

**Files:**
- Modify: `web/src/pages/MindMap.jsx:187-194`
- Reference: `web/src/pages/MindMap.jsx:139` (deleteTarget state)

- [ ] **Step 1: 查看现有 deleteTarget 和 ConfirmDialog 的使用方式**

当前代码（第 516-523 行）：
```jsx
<ConfirmDialog
  open={!!deleteTarget}
  title="确认删除"
  message={`确定要删除节点 "${deleteTarget?.name}" 吗？此操作不可撤销。`}
  confirmText="删除"
  destructive
  onConfirm={confirmDelete}
  onCancel={() => setDeleteTarget(null)}
/>
```

- [ ] **Step 2: 在 MindMap.jsx 添加新的 state 来存储删除选项**

在 `const [deleteTarget, setDeleteTarget] = useState(null);` 下方添加：

```javascript
const [deleteMode, setDeleteMode] = useState(null); // null | "entire-tree" | "parent-only"
```

- [ ] **Step 3: 添加检测子节点数量的函数**

在 `deleteNode` 函数上方添加：

```javascript
// 检测节点是否有子节点
const hasChildren = (nodeId) => {
  return db.notes.count().where({ top: nodeId }).run() > 0;
};
```

- [ ] **Step 4: 修改 deleteNode 函数**

原代码（第 187-194 行）：
```javascript
const deleteNode = (id, title) => {
  setNotesData(nds => nds.filter(n => n.id !== id));
  setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
  db.notes.delete({ "id": id });
  // 同时删除markdown文件
  const result = window.api.deleteFile(`${id}-${title}.md`);
  if (handleFileError(result)) return;
};
```

修改为：
```javascript
const deleteNode = (id, title, grandParentId = null) => {
  setNotesData(nds => nds.filter(n => n.id !== id));
  setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
  db.notes.delete({ "id": id });
  // 同时删除markdown文件
  const result = window.api.deleteFile(`${id}-${title}.md`);
  if (handleFileError(result)) return;
};
```

- [ ] **Step 5: 添加新的 deleteNodeWithChildren 函数**

在 `deleteNode` 函数后添加：

```javascript
// 删除有子节点的节点前的检查
const deleteNodeWithChildrenCheck = (id, title) => {
  const childCount = db.notes.count().where({ top: id }).run();
  if (childCount === 0) {
    // 没有子节点，直接删除
    deleteNode(id, title);
  } else {
    // 有子节点，弹出选择对话框
    setDeleteTarget({ id, name: title, childCount });
  }
};
```

- [ ] **Step 6: 修改 shortcut handler 调用**

当前 shortcut handler（第 166-168 行）：
```javascript
if (matchKey(shortcuts.node?.deleteNode, e)) {
  e.preventDefault();
  setDeleteTarget({ id: selectedNode.id, name: selectedNode.name });
  return;
}
```

修改为：
```javascript
if (matchKey(shortcuts.node?.deleteNode, e)) {
  e.preventDefault();
  const childCount = db.notes.count().where({ top: selectedNode.id }).run();
  if (childCount === 0) {
    deleteNode(selectedNode.id, selectedNode.name);
  } else {
    setDeleteTarget({ id: selectedNode.id, name: selectedNode.name, childCount });
  }
  return;
}
```

- [ ] **Step 7: 修改 ConfirmDialog 为 DeleteNodeDialog**

找到 ConfirmDialog 组件调用（第 516-523 行左右），修改为：

```jsx
{/* 原来的 ConfirmDialog 删除确认 */}
// <ConfirmDialog
//   open={!!deleteTarget}
//   ...

{/* 新增：删除选项对话框 */}
<DeleteNodeDialog
  open={!!deleteTarget}
  nodeName={deleteTarget?.name}
  childCount={deleteTarget?.childCount || 0}
  onDeleteEntireTree={() => {
    // 实现删除整个子树
    const id = deleteTarget.id;
    const title = deleteTarget.name;
    // TODO: 实现删除整个子树的逻辑
    setDeleteTarget(null);
    clearSelectedNode();
  }}
  onDeleteParentOnly={() => {
    // 实现仅删除父节点
    const id = deleteTarget.id;
    const title = deleteTarget.name;
    // TODO: 实现子节点提升的逻辑
    setDeleteTarget(null);
    clearSelectedNode();
  }}
  onCancel={() => setDeleteTarget(null)}
/>
```

- [ ] **Step 8: 提交**

```bash
git add web/src/pages/MindMap.jsx
git commit -m "feat: check children before delete, show dialog for nodes with children"
```

---

## 3. 实现删除整个子树

### Task 3: 实现递归删除所有子节点

**Files:**
- Modify: `web/src/pages/MindMap.jsx`

- [ ] **Step 1: 添加递归查询所有后代节点的函数**

在 `hasChildren` 函数附近添加：

```javascript
// 递归获取所有后代节点 ID
const getAllDescendantIds = (nodeId) => {
  const descendantIds = [nodeId];
  const directChildren = db.notes.select().where({ top: nodeId }).run();
  for (const child of directChildren) {
    descendantIds.push(...getAllDescendantIds(child.id));
  }
  return descendantIds;
};
```

- [ ] **Step 2: 添加 deleteEntireTree 函数**

```javascript
// 删除整个子树
const deleteEntireTree = (id, title) => {
  const allIds = getAllDescendantIds(id);
  const allTitles = [];

  // 从数据库和 UI 中删除所有节点
  setNotesData(nds => nds.filter(n => !allIds.includes(n.id)));
  setEdges(eds => eds.filter(e => !allIds.includes(e.source) && !allIds.includes(e.target)));

  // 获取所有标题用于删除文件
  allIds.forEach(nodeId => {
    const node = db.notes.select().where({ id: nodeId }).run()[0];
    if (node) {
      allTitles.push(`${nodeId}-${node.name}.md`);
    }
  });

  // 删除数据库记录
  db.notes.delete((n) => allIds.includes(n.id));

  // 删除所有相关文件
  allTitles.forEach(fileName => {
    const result = window.api.deleteFile(fileName);
    if (handleFileError(result)) return;
  });
};
```

- [ ] **Step 3: 提交**

```bash
git add web/src/pages/MindMap.jsx
git commit -m "feat: implement deleteEntireTree function"
```

---

## 4. 实现仅删除父节点（子节点提升）

### Task 4: 实现子节点提升逻辑

**Files:**
- Modify: `web/src/pages/MindMap.jsx`

- [ ] **Step 1: 添加 promoteChildren 函数**

```javascript
// 将子节点提升到祖父节点下
const promoteChildren = (parentId, grandParentId) => {
  // 更新所有直接子节点的 top 为 grandParentId
  db.notes.update({ top: parentId }, { top: grandParentId });

  // 更新 notesData 状态
  setNotesData(nds => nds.map(n => {
    if (n.top === parentId) {
      return { ...n, top: grandParentId };
    }
    return n;
  }));
};
```

- [ ] **Step 2: 在 MindMap.jsx 中获取节点的 top 字段**

需要修改 `deleteNodeWithChildrenCheck` 来获取 grandParentId：

```javascript
const deleteNodeWithChildrenCheck = (id, title) => {
  const childCount = db.notes.count().where({ top: id }).run();
  if (childCount === 0) {
    deleteNode(id, title);
  } else {
    // 获取当前节点的 top（祖父节点 ID）
    const currentNode = db.notes.select().where({ id: id }).run()[0];
    const grandParentId = currentNode?.top || null;
    setDeleteTarget({ id, name: title, childCount, grandParentId });
  }
};
```

- [ ] **Step 3: 在 DeleteNodeDialog 的 onDeleteParentOnly 中调用 promoteChildren**

修改 DeleteNodeDialog 的 onDeleteParentOnly 回调：

```jsx
onDeleteParentOnly={() => {
  const id = deleteTarget.id;
  const grandParentId = deleteTarget.grandParentId;
  promoteChildren(id, grandParentId);
  deleteNode(id, deleteTarget.name);
  setDeleteTarget(null);
  clearSelectedNode();
}}
```

- [ ] **Step 4: 提交**

```bash
git add web/src/pages/MindMap.jsx
git commit -m "feat: implement promoteChildren function"
```

---

## 5. 测试验证

### Task 5: 手动测试各场景

**Test Setup:**
- 启动项目：`pnpm start`

- [ ] **Test 1: 删除空节点**

1. 选中一个没有子节点的节点
2. 按 Delete 键
3. 验证直接删除，无弹窗

- [ ] **Test 2: 删除有子节点的节点 - 删除整个子树**

1. 选中一个有子节点的节点（如节点 A，有子节点 B、C）
2. 按 Delete 键
3. 验证弹出 DeleteNodeDialog
4. 选择"删除整个子树"，点击确认
5. 验证 A、B、C 都被删除

- [ ] **Test 3: 删除有子节点的节点 - 仅删除父节点**

1. 选中一个有子节点的节点（如节点 A，有子节点 B、C，A 的父节点是 P）
2. 按 Delete 键
3. 验证弹出 DeleteNodeDialog
4. 选择"仅删除父节点"，点击确认
5. 验证 A 被删除，B、C 现在是 P 的子节点

- [ ] **Test 4: 删除有子节点的节点 - 取消**

1. 选中一个有子节点的节点
2. 按 Delete 键
3. 验证弹出 DeleteNodeDialog
4. 点击取消
5. 验证节点未被删除

---

## 执行选项

**1. Subagent-Driven (recommended)** - 任务分批执行，每批完成后检查点

**2. Inline Execution** - 当前 session 连续执行

**选择哪个方式？**