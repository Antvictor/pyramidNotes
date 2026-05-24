## Context

### 当前状态

应用使用 Electron + React 技术栈，架构如下：

```
electron/main.cjs → electron/preload.cjs → window.api (Renderer)
                                              ↓
                                         React Apps
                                         ├── MindMap (ReactFlow)
                                         ├── Note (TipTap Editor)
                                         └── Settings
```

现有设置系统：
- `electron/common/settings.cjs`: `loadSettings()`, `saveSettings()` 读写 `userData/settings.json`
- `DEFAULT_SETTINGS`: `{ theme, storagePath, autoUpdate, language }`

现有快捷键：
- `Node.jsx` 硬编码 `keyBindings`: `{ key: "Mod-b", action: "bold" }`, `{ key: "Mod-i", action: "italic" }`
- `ContextMenu.jsx`: 右键菜单"创建/修改/删除节点"（无键盘快捷键）

### 问题约束

1. 快捷键需要**全局**生效，不受路由限制
2. 节点选中状态需要跨组件共享
3. 修改快捷键必须**实时生效**（不需要重启）
4. 持久化使用现有的 `settings.json` 机制

### 利益相关者

- 用户：需要高效键盘操作
- 开发者：需要可维护的快捷键架构

## Goals / Non-Goals

**Goals:**
- 实现全局快捷键系统，支持节点操作和笔记格式化
- 节点选择交互：单击选中（高亮+居中），双击进入编辑
- 快捷键配置界面，可查看和修改所有快捷键
- 快捷键持久化到 settings.json，修改即时生效

**Non-Goals:**
- 不支持宏命令或多键组合序列（如 Ctrl+Shift+K）
- 不支持快捷键冲突检测（用户需自行避免）
- 不支持导入/导出快捷键配置

## Decisions

### Decision 1: 全局快捷键监听架构

**选项 A**: 在 App.jsx 使用 `useEffect` + `window.addEventListener`
**选项 B**: 创建独立的 `KeyboardShortcuts` 组件，放在 Router 外层
**选项 C**: 使用 React Context + Custom Hook `useGlobalShortcuts`

**选择**: **选项 C** - 使用 Context + Hook 模式

**理由**:
- Context 可共享 `selectedNodeId` 状态
- Hook 可封装快捷键处理逻辑
- 组件树外层可放置 Provider，无需修改路由结构

**实现**:
```javascript
// web/src/contexts/SelectedNodeContext.jsx
export const SelectedNodeContext = createContext({
  selectedNode: null,        // { id, name } | null
  setSelectedNode: () => {},
  clearSelectedNode: () => {}
});

// web/src/hooks/useShortcuts.js
export function useShortcuts() {
  const { selectedNode, setSelectedNode } = useContext(SelectedNodeContext);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e) => {
      // 根据 location.pathname 和 selectedNode 分发快捷键
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedNode, location.pathname]);

  return { handleShortcut };
}
```

### Decision 2: 节点选择视觉反馈

**选项 A**: 使用 CSS class 切换 `.selected { border-color: var(--link-color); }`
**选项 B**: 在 NodeCustom 组件内部根据 `selectedNode.id === data.id` 动态改变 style
**选项 C**: 使用 ReactFlow 内置 `selected` 属性 + CSS

**选择**: **选项 B** - 直接改变 style，ReactFlow 的 `selected` 属性更适合多选场景

**理由**:
- 直接控制 style 更灵活
- 不依赖 ReactFlow 的选中机制（我们的选中是单选）
- 便于扩展（如添加动画）

**实现**:
```javascript
// NodeCustom.jsx
const { selectedNodeId } = useContext(SelectedNodeContext);

<div
  onClick={() => setSelectedNode(data.id, data.name)}
  onDoubleClick={() => navigate(`/note/${data.id}/${data.name}`)}
  style={{
    border: selectedNodeId === data.id
      ? '2px solid var(--link-color)'
      : '1px solid var(--border)',
    // ...其他样式
  }}
>
```

### Decision 3: 居中到选中节点

**选择**: 使用 `reactflow.fitView()` + `nodes: [selectedNode]`

**实现**:
```javascript
// MindMap.jsx
const { fitView } = useReactFlow();

const selectNode = (nodeId) => {
  setSelectedNode(nodeId);
  fitView({ nodes: nodes.filter(n => n.id === nodeId), duration: 300 });
};
```

### Decision 4: 快捷键配置数据结构

**选择**: 在 settings.json 中新增 `shortcuts` 字段

```json
{
  "theme": "system",
  "storagePath": "...",
  "shortcuts": {
    "node": {
      "newNode": "Ctrl+N",
      "renameNode": "F2",
      "deleteNode": "Delete"
    },
    "note": {
      "bold": "Ctrl+B",
      "italic": "Ctrl+I",
      "heading1": "Ctrl+1",
      "heading2": "Ctrl+2"
    },
    "global": {
      "search": "Ctrl+K",
      "backToMap": "Escape"
    }
  }
}
```

**理由**:
- 复用现有 settings 持久化机制
- 按功能分类，便于 UI 展示
- 支持未来扩展更多快捷键

### Decision 5: 默认快捷键

```javascript
// electron/common/settings.cjs
const DEFAULT_SETTINGS = {
  theme: 'system',
  storagePath: path.join(app.getPath('documents'), 'pyramidNotes'),
  autoUpdate: true,
  language: 'en',
  shortcuts: {
    node: {
      newNode: 'Ctrl+N',
      renameNode: 'F2',
      deleteNode: 'Delete'
    },
    note: {
      bold: 'Ctrl+B',
      italic: 'Ctrl+I',
      heading1: 'Ctrl+1',
      heading2: 'Ctrl+2'
    },
    global: {
      search: 'Ctrl+K',
      backToMap: 'Escape'
    }
  }
};
```

### Decision 6: 快捷键修改 UI

**选项 A**: 点击快捷键单元格 → 直接进入编辑模式
**选项 B**: 点击修改按钮 → 弹出输入框
**选项 C**: 双击快捷键 → 进入编辑模式

**选择**: **选项 A** - 类似 Excel 的行内编辑

**实现**:
```javascript
// ShortcutsModal.jsx
const [editingKey, setEditingKey] = useState(null);

<td
  onClick={() => !isLocked && setEditingKey(actionKey)}
>
  {editingKey === actionKey ? (
    <input
      autoFocus
      value={shortcuts[node][actionKey]}
      onChange={(e) => updateShortcut(node, actionKey, e.target.value)}
      onBlur={() => setEditingKey(null)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') setEditingKey(null);
        if (e.key === 'Escape') setEditingKey(null);
      }}
    />
  ) : shortcuts[node][actionKey]}
</td>
```

### Decision 7: 删除确认对话框

**选择**: 复用 `PermissionDialog` 风格，或创建轻量 `ConfirmDialog`

```javascript
// ConfirmDialog 简洁版本
<Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>确认删除</DialogTitle>
    </DialogHeader>
    <p>确定要删除节点 <strong>{deleteTarget?.name}</strong> 吗？此操作不可撤销。</p>
    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
      <Button variant="outline" onClick={() => setDeleteTarget(null)}>取消</Button>
      <Button variant="destructive" onClick={() => confirmDelete()}>删除</Button>
    </div>
  </DialogContent>
</Dialog>
```

### Decision 8: 快捷键匹配逻辑

```javascript
function matchShortcut(e, shortcutStr) {
  const isMod = e.ctrlKey || e.metaKey;
  const isShift = e.shiftKey;
  const isAlt = e.altKey;

  // 解析 shortcutStr 如 "Ctrl+B", "F2", "Delete"
  const parts = shortcutStr.split('+');
  const modifiers = parts.slice(0, -1);
  const key = parts[parts.length - 1];

  const modMatch =
    modifiers.includes('Ctrl') ? isMod :
    modifiers.includes('Alt') ? isAlt :
    modifiers.includes('Shift') ? isShift :
    (!isMod && !isAlt && !isShift);

  const keyMatch =
    key === 'Escape' ? e.key === 'Escape' :
    key === 'Delete' ? e.key === 'Delete' :
    key === 'Backspace' ? e.key === 'Backspace' :
    key === 'Enter' ? e.key === 'Enter' :
    key.startsWith('F') ? e.key === key :
    e.key.toLowerCase() === key.toLowerCase();

  return modMatch && keyMatch;
}
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| 快捷键与浏览器/系统冲突 | 提供 Esc 返回键锁定选项，用户可自定义 |
| 多个快捷键同时触发 | 按优先级处理：全局 (Esc, Ctrl+K) > 节点操作 > 笔记格式化 |
| 快捷键冲突检测缺失 | 在 UI 中标注当前快捷键配置，用户需自行避免重复 |
| Esc 在 Note 页面误触发返回 | 仅在编辑器内容为空或未修改时触发，或使用确认提示 |

## Migration Plan

**Phase 1**: 创建基础设施
1. 创建 `SelectedNodeContext`
2. 创建 `useShortcuts` hook
3. 添加 shortcuts 到 DEFAULT_SETTINGS

**Phase 2**: 节点选择交互
1. 修改 NodeCustom 单击/双击行为
2. 实现选中高亮和居中
3. 全局状态同步

**Phase 3**: 全局快捷键
1. 实现 MindMap 页面快捷键（Ctrl+N, F2, Delete, Ctrl+K）
2. 实现 Note 页面快捷键（Esc, Ctrl+B/I/1/2, Ctrl+N）
3. 删除确认对话框

**Phase 4**: 设置界面
1. 添加快捷键入口到 Settings.jsx
2. 创建 ShortcutsModal
3. 实现快捷键修改和持久化

**回滚**: 通过 git 恢复修改的文件，删除新创建的文件