## 1. Infrastructure (基础设施)

- [x] 1.1 Create `web/src/contexts/SelectedNodeContext.jsx`
  - Export `SelectedNodeContext` with `{ selectedNode, setSelectedNode, clearSelectedNode, shortcuts }`
  - Provider wraps children
  - `selectedNode` default is `null`

- [x] 1.2 Create `web/src/hooks/useShortcuts.js`
  - Import `useContext(SelectedNodeContext)` and `useLocation`, `useNavigate`
  - `useEffect` with `window.addEventListener('keydown', handler)`
  - Handler reads `shortcuts` from context and `selectedNode` state
  - Match shortcut using `matchShortcut(e, shortcutStr)` function
  - Route分发逻辑：
    - MindMap 页面: Ctrl+N/F2/Delete/Ctrl+K
    - Note 页面: Esc/Ctrl+B/I/1/2/Ctrl+N
  - Cleanup: `return () => window.removeEventListener('keydown', handler)`

- [x] 1.3 Update `electron/common/settings.cjs`
  - Add `DEFAULT_SHORTCUTS` constant:
    ```javascript
    const DEFAULT_SHORTCUTS = {
      node: { newNode: 'Ctrl+N', renameNode: 'F2', deleteNode: 'Delete' },
      note: { bold: 'Ctrl+B', italic: 'Ctrl+I', heading1: 'Ctrl+1', heading2: 'Ctrl+2' },
      global: { search: 'Ctrl+K', backToMap: 'Escape' }
    };
    ```
  - Merge into `DEFAULT_SETTINGS`: `...DEFAULT_SETTINGS, shortcuts: DEFAULT_SHORTCUTS`

- [x] 1.4 Update `App.jsx`
  - Import `SelectedNodeContext` and `useShortcuts`
  - Wrap children with `<SelectedNodeContext.Provider>`
  - Provide value: `{ selectedNode, setSelectedNode, clearSelectedNode, shortcuts }`
  - Call `useShortcuts()` in child component (not inside Provider directly)


## 2. Node Selection (节点选择交互)

- [x] 2.1 Update `web/src/pages/note/NodeCustom.jsx`
  - Import `useContext(SelectedNodeContext)` and `useNavigate`
  - Add state `const { selectedNode, setSelectedNode } = useContext(SelectedNodeContext)`
  - Replace `onClick` to call `setSelectedNode(data.id, data.name)` instead of navigate
  - Keep `onDoubleClick` with `navigate(`/note/${data.id}/${data.name}`)`
  - Update style to include selected state:
    ```javascript
    style={{
      ...style,
      border: selectedNode?.id === data.id
        ? '2px solid var(--link-color)'
        : '1px solid var(--border)',
      transition: 'border-color 0.2s'
    }}
    ```

- [x] 2.2 Update `web/src/pages/MindMap.jsx`
  - Import `SelectedNodeContext`, `useReactFlow`, `useNodesState`
  - Provide Context value via wrapper component
  - Add `handleSelectNode` function:
    ```javascript
    const handleSelectNode = (nodeId, nodeName) => {
      setSelectedNode(nodeId, nodeName);
      fitView({ nodes: nodes.filter(n => n.id === nodeId), duration: 300, padding: 0.2 });
    };
    ```
  - Pass `handleSelectNode` to `NodeCustom` via `data.onSelect`
  - Add `onPaneClick` callback to call `clearSelectedNode()`
  - Add Delete confirm dialog state `const [deleteTarget, setDeleteTarget] = useState(null)`
  - Implement delete handler:
    ```javascript
    const confirmDelete = () => {
      if (deleteTarget) {
        deleteNode(deleteTarget.id, deleteTarget.name);
        clearSelectedNode();
        setDeleteTarget(null);
      }
    };
    ```


## 3. Global Shortcuts (全局快捷键)

- [x] 3.1 Implement `matchShortcut` utility function in `useShortcuts.js`
  ```javascript
  function matchShortcut(e, shortcutStr) {
    if (!shortcutStr) return false;
    const isMod = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;
    const isAlt = e.altKey;
    const parts = shortcutStr.split('+');
    const modifiers = parts.slice(0, -1);
    const key = parts[parts.length - 1];

    // Check each required modifier
    for (const mod of modifiers) {
      if (mod === 'Ctrl' && !isMod) return false;
      if (mod === 'Shift' && !isShift) return false;
      if (mod === 'Alt' && !isAlt) return false;
    }

    // Determine if modifier is required based on shortcut string
    const requiresMod = modifiers.includes('Ctrl') || modifiers.includes('Alt') || modifiers.includes('Shift');

    // For modifiers not explicitly specified, require them NOT to be pressed
    const modStateMatch =
      (modifiers.includes('Ctrl') || !isMod) &&
      (modifiers.includes('Shift') || !isShift) &&
      (modifiers.includes('Alt') || !isAlt);

    // Check key match
    const keyMatch =
      key === 'Escape' ? e.key === 'Escape' :
      key === 'Delete' ? e.key === 'Delete' :
      key === 'Enter' ? e.key === 'Enter' :
      key === 'Backspace' ? e.key === 'Backspace' :
      key.startsWith('F') ? e.key === key :
      e.key.toLowerCase() === key.toLowerCase();

    return keyMatch && modStateMatch;
  }
  ```

- [x] 3.2 MindMap shortcuts handler
  - Check `selectedNode` exists before node operations
  - `Ctrl+N`: Call `addNewNode(selectedNode.id)` (reuse existing function)
  - `F2`: Call `updateNode(selectedNode.id, selectedNode.name)` (reuse existing)
  - `Delete`: Set `deleteTarget` state (show confirm dialog)
  - `Ctrl+K`: Open search dialog `setSearchOpen(true)`
  - `Esc`: If search open, close it; else `clearSelectedNode()`

- [x] 3.3 Note page shortcuts handler
  - `Esc`: Call `navigate('/')` to return to MindMap
  - `Ctrl+B/I/1/2`: These are handled by TipTapEditor's `keyBindings`
  - `Ctrl+N`: Navigate to `/note/${selectedNode.id}/new-child` or use existing prompt
  - Pass `keyBindings` from `shortcuts.note` to `TipTapEditor` component

- [x] 3.4 Update `Note.jsx`
  - Import and use `shortcuts` from context
  - `useEffect` to handle Esc key (return to MindMap)
  - Pass `keyBindings` to `TipTapEditor`:
    ```javascript
    const [keys, setKeys] = useState([
      { key: shortcuts.note.bold, action: 'bold' },
      { key: shortcuts.note.italic, action: 'italic' },
      { key: shortcuts.note.heading1, action: 'heading1' },
      { key: shortcuts.note.heading2, action: 'heading2' },
    ]);
    ```
  - Use `selectedNode` to get parent node for `Ctrl+N` new child


## 4. Delete Confirmation (删除确认)

- [x] 4.1 Create `web/src/components/ui/confirm-dialog.tsx`
  ```typescript
  interface ConfirmDialogProps {
    open: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    destructive?: boolean; // red delete button
  }
  ```
  - Use existing `Dialog` component from `web/src/components/ui/dialog.tsx`
  - Style confirm button red if `destructive={true}`

- [x] 4.2 Integrate `ConfirmDialog` in `MindMap.jsx`
  - Import `ConfirmDialog`
  - Add `deleteTarget` state: `{ id: string, name: string } | null`
  - Pass to dialog:
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
  - `confirmDelete` calls `deleteNode()` then `clearSelectedNode()`


## 5. Settings UI (设置页面快捷键配置)

- [x] 5.1 Update `web/src/pages/settings/Settings.jsx`
  - Add "快捷键" row in existing sections:
    ```jsx
    <div style={rowStyle}>
      <span style={labelStyle}>快捷键</span>
      <button onClick={() => setShortcutsModalOpen(true)}>配置</button>
    </div>
    ```
  - Add state `const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false)`
  - Import and render `<ShortcutsModal open={shortcutsModalOpen} onOpenChange={setShortcutsModalOpen} />`

- [x] 5.2 Create `web/src/pages/settings/ShortcutsModal.jsx`
  - Props: `{ open, onOpenChange }`
  - State:
    ```javascript
    const [shortcuts, setShortcuts] = useState(DEFAULT_SHORTCUTS);
    const [editingKey, setEditingKey] = useState(null);
    ```
  - Load shortcuts on mount: `useEffect(() => { loadShortcuts(); }, [])`
  - `loadShortcuts()`: `const s = await window.api.getSettings(); setShortcuts(s.shortcuts || DEFAULT_SHORTCUTS);`
  - UI structure (Tabs: 节点快捷键 | 笔记快捷键):
    ```
    ┌─────────────────────────────────────────────┐
    │ 快捷键设置                            [X]     │
    ├─────────────────────────────────────────────┤
    │ [节点快捷键] [笔记快捷键]                    │
    ├─────────────────────────────────────────────┤
    │ 新建节点    Ctrl+N          [修改]          │
    │ 修改节点    F2              [修改]          │
    │ 删除节点    Delete          [修改]          │
    │ 搜索        Ctrl+K          [锁定]          │
    │ 返回思维导图 Esc             [锁定]          │
    │ 加粗        Ctrl+B          [修改]          │
    │ 斜体        Ctrl+I          [修改]          │
    │ 标题1       Ctrl+1          [修改]          │
    │ 标题2       Ctrl+2          [修改]          │
    └─────────────────────────────────────────────┘
         [重置为默认]              [确定]
    ```
  - Inline edit: click shortcut cell → `<input>` with autoFocus
  - Locked shortcuts: display label "[锁定]" instead of edit button
  - `saveShortcuts()`: `await window.api.saveSettings({ shortcuts }); onOpenChange(false);`

- [x] 5.3 Update `shortcuts` on settings change
  - Listen to `window.api.onSettingsChanged` in `ShortcutsModal`
  - When settings change, update local state


## 6. Review & Verification (Review 检查)

- [x] 6.1 Review `SelectedNodeContext` for context API correctness
- [x] 6.2 Review `useShortcuts` for edge cases:
  - What if `selectedNode` is null for node operations?
  - What if `shortcuts` is undefined in settings?
  - Escape key handling in Note vs MindMap
- [x] 6.3 Review `NodeCustom` click/double-click interaction
- [x] 6.4 Review `fitView` called with correct node reference
- [x] 6.5 Review shortcut key matching logic for all cases (Ctrl, Alt, Shift, F-keys, Delete, Esc)
- [x] 6.6 Review delete confirmation flow
- [x] 6.7 Review settings persistence (read/write/subscribe)