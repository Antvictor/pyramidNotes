## What It Does

`shortcut-persistence` 管理快捷键配置的持久化，包括：
1. 从 settings.json 读取快捷键配置
2. 保存修改的快捷键到 settings.json
3. 提供默认值（出厂设置）
4. 实时生效（不需重启）

## Data Structure

```json
{
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

## How It Works

### 读取流程

```
App.jsx (mount) → window.api.getSettings() → settings.shortcuts
                                                    ↓
                                            SelectedNodeContext
                                                    ↓
                                              useShortcuts()
```

### 保存流程

```
ShortcutsModal (点击确定) → window.api.saveSettings({ shortcuts })
                                              ↓
                                    settings-changed 广播
                                              ↓
                                    所有订阅组件更新
```

## Default Shortcuts

```javascript
const DEFAULT_SHORTCUTS = {
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
};
```

## API

### Settings IPC

```javascript
// 读取
ipcRenderer.handle('getSettings') → Settings

// 保存（部分更新）
ipcRenderer.handle('saveSettings', { shortcuts: {...} }) → boolean
```

### ShortcutsModal

```javascript
interface ShortcutsModalProps {
  open: boolean,
  onOpenChange: (open: boolean) => void
}

// 内部状态
const [shortcuts, setShortcuts] = useState(DEFAULT_SHORTCUTS)
const [editingKey, setEditingKey] = useState(null)  // 当前编辑的快捷键

// 方法
loadShortcuts() → 从 settings 读取当前配置
saveShortcuts(newShortcuts) → 保存到 settings，触发 settings-changed
resetToDefaults() → 重置为 DEFAULT_SHORTCUTS
```

## Visual Structure

```
┌─────────────────────────────────────────────┐
│  快捷键设置                            [X]   │
├─────────────────────────────────────────────┤
│  ┌───────────────┬───────────────────────┐  │
│  │ 节点快捷键     │ 笔记快捷键             │  │
│  ├───────────────┼───────────────────────┤  │
│  │ 新建节点       │ Ctrl+N    [修改]       │  │
│  │ 修改节点       │ F2        [修改]       │  │
│  │ 删除节点       │ Delete    [修改]       │  │
│  │ 搜索          │ Ctrl+K    [锁定]       │  │
│  ├───────────────┼───────────────────────┤  │
│  │ 加粗          │ Ctrl+B    [修改]       │  │
│  │ 斜体          │ Ctrl+I    [修改]       │  │
│  │ 标题1         │ Ctrl+1    [修改]       │  │
│  │ 标题2         │ Ctrl+2    [修改]       │  │
│  │ 返回思维导图   │ Esc       [锁定]       │  │
│  └───────────────┴───────────────────────┘  │
│                                             │
│            [重置为默认]      [确定]           │
└─────────────────────────────────────────────┘
```

## Edge Cases

1. **settings.json 不存在 shortcuts 字段**：使用 DEFAULT_SHORTCUTS，并自动合并
2. **快捷键为空字符串**：该快捷键被禁用（不响应）
3. **重复快捷键**：不检测，用户需自行避免
4. **backToMap (Esc) 锁定**：UI 中显示"[锁定]"标签，不可修改

## Files

- `electron/common/settings.cjs` - 添加 DEFAULT_SHORTCUTS
- `web/src/pages/settings/ShortcutsModal.jsx` - 快捷键配置 UI
- `web/src/components/ui/confirm-dialog.tsx` - 可选复用或新建 ConfirmDialog