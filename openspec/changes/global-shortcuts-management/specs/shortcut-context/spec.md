## What It Does

`shortcut-context` 提供全局快捷键上下文管理，包含：
1. 节点选中状态（`selectedNodeId`, `selectedNodeName`）
2. 快捷键分发逻辑（根据当前路由和选中状态）
3. 快捷键配置读取（从 settings）

## How It Works

```
SelectedNodeContext.Provider
  └── useSelectedNode() ← 所有组件共享选中状态
                              │
useShortcuts() ← 全局快捷键监听
  ├── useContext(SelectedNodeContext) → 读取 selectedNode
  ├── useLocation() → 判断当前页面
  └── window.addEventListener('keydown') → 分发处理
```

## API

### SelectedNodeContext

```javascript
// Context Value
{
  selectedNode: { id: string, name: string } | null,
  setSelectedNode: (id: string, name: string) => void,
  clearSelectedNode: () => void,
  shortcuts: ShortcutConfig  // 从 settings 读取
}
```

### useShortcuts Hook

```javascript
// hook 返回快捷键处理函数
function useShortcuts(): void

// 内部使用 useEffect 监听 keydown
// 根据当前路由处理快捷键分发
// 不需要返回值，快捷键自动生效
```

## Behavior

### 快捷键分发规则

| 快捷键 | MindMap (有选中) | MindMap (无选中) | Note 页面 |
|--------|-----------------|-----------------|-----------|
| Ctrl+N | 新建子节点 | - | 新建子节点 |
| F2 | 修改节点 | - | 修改节点名称 |
| Delete | 删除节点 | - | - |
| Ctrl+K | 打开搜索 | 打开搜索 | 打开搜索 |
| Esc | 清除选中 | 关闭搜索 | 返回 MindMap |
| Ctrl+B | - | - | 加粗 |
| Ctrl+I | - | - | 斜体 |

### selectedNode 更新时机

- 单击 NodeCustom → `setSelectedNode(id, name)`
- 点击画布空白 → `clearSelectedNode()`
- 点击其他节点 → `setSelectedNode(newId, newName)`
- Esc 返回 MindMap → 保持选中状态不清除

## Files

- `web/src/contexts/SelectedNodeContext.jsx` - Context Provider
- `web/src/hooks/useShortcuts.js` - 快捷键监听 Hook

## Edge Cases

1. **Note 页面无选中节点时 Ctrl+N**：使用当前笔记对应的节点作为父节点
2. **F2 在 Note 页面**：直接修改节点名称（不区分页面）
3. **多个同时按下**：不处理，只响应单键按下