## What It Does

`node-selection` 管理思维导图中节点的选择状态，包含：
1. 单击选中节点
2. 双击进入编辑器
3. 视觉高亮（边框变色）
4. 自动居中到视口

## Interaction Model

```
NodeCustom 组件：
  ├── onClick → setSelectedNode(id, name)
  │                └── fitView({ nodes: [selectedNode], duration: 300 })
  │
  └── onDoubleClick → navigate(`/note/${id}/${name}`)
                          └── 保持 selectedNode 状态不清除
```

## Visual Feedback

### 选中状态

```javascript
// NodeCustom.jsx
<div
  onClick={handleSelect}
  onDoubleClick={handleEnter}
  style={{
    border: selectedNodeId === data.id
      ? '2px solid var(--link-color)'  // 选中态
      : '1px solid var(--border)',       // 默认态
    transition: 'border-color 0.2s, border-width 0.2s'
  }}
>
```

### 选中后自动居中

```javascript
// MindMap.jsx
const { fitView } = useReactFlow();

const handleSelectNode = (nodeId) => {
  setSelectedNode(nodeId, nodeName);
  fitView({
    nodes: nodes.filter(n => n.id === nodeId),
    duration: 300,
    padding: 0.2
  });
};
```

## State Management

```
SelectedNodeContext:
  selectedNode: { id: string, name: string } | null

MindMap.jsx:
  - 提供 Context value
  - 订阅 ReactFlow nodes 变化
  - fitView 调用

NodeCustom.jsx:
  - 消费 selectedNode
  - onClick → 调用 context.setSelectedNode
```

## Edge Cases

1. **点击画布空白**：清除选中 → `clearSelectedNode()`
2. **点击其他节点**：先清除当前选中，再设置新的
3. **节点删除后选中**：自动清除选中状态
4. **页面跳转后返回**：保持选中状态（不清除）

## Component: DeleteConfirmDialog

```javascript
// 复用 PermissionDialog 或新建 ConfirmDialog
// MindMap.jsx 引入，当 Delete 快捷键触发时显示

<ConfirmDialog
  open={!!deleteTarget}
  title="确认删除"
  message={`确定要删除节点 "${deleteTarget?.name}" 吗？此操作不可撤销。`}
  confirmText="删除"
  cancelText="取消"
  onConfirm={() => {
    deleteNode(deleteTarget.id, deleteTarget.name);
    clearSelectedNode();
    setDeleteTarget(null);
  }}
  onCancel={() => setDeleteTarget(null)}
/>
```

## Files

- `web/src/pages/note/NodeCustom.jsx` - 修改点击行为
- `web/src/pages/MindMap.jsx` - 提供 Context、fitView、删除逻辑