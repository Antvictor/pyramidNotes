## Why

用户需要在笔记应用中高效地通过键盘快捷键操作节点和笔记内容。当前的问题：
1. **节点操作需要鼠标**：右键菜单创建/修改/删除节点效率低
2. **快捷键分散**：笔记编辑器快捷键（如 Ctrl+B 加粗）仅在编辑页面可用，无法从全局触发
3. **无法自定义**：用户无法查看或修改现有的快捷键绑定
4. **缺乏视觉反馈**：节点选中状态不够明显，且未居中显示

通过实现全局快捷键管理，用户可以在任何页面通过快捷键高效操作，提升工作流效率。

## What Changes

1. **全局快捷键系统**
   - App 层级统一监听快捷键，根据当前路由和选中状态分发
   - 节点选择状态全局共享（Context）
   - 快捷键配置持久化到 settings.json

2. **节点选择交互重构**
   - 单击 NodeCustom：选中节点（边框高亮 + 自动居中）
   - 双击 NodeCustom：进入编辑器
   - 点击画布空白：清除选中
   - 点击其他节点：自动切换选中

3. **快捷键功能映射**
   - `Ctrl+N`：新建子节点（MindMap 或 Note 页面）
   - `F2`：修改节点名称（全局可用）
   - `Delete`：删除节点（需确认对话框）
   - `Ctrl+K`：打开搜索
   - `Esc`：清除选中 / 返回 MindMap / 关闭搜索
   - `Ctrl+B/I/1/2`：笔记格式化（Note 页面）

4. **设置页面快捷键配置**
   - 在设置目录添加"快捷键"入口
   - 弹窗展示所有快捷键分类（节点快捷键、笔记快捷键）
   - 支持修改快捷键（Esc 返回键锁定不可修改）
   - 修改后实时生效并持久化

5. **视觉反馈**
   - 选中节点边框变为 `--link-color`
   - 自动 fitView 居中到选中节点

## Capabilities

### New Capabilities

- `shortcut-context`: 全局快捷键上下文管理，提供 selectedNode 状态和快捷键分发
- `shortcut-persistence`: 快捷键配置持久化，支持 CRUD 操作和实时生效
- `node-selection`: 节点选中状态管理，包含视觉反馈和居中逻辑

### Modified Capabilities

- (无 - 新功能不影响现有 spec 要求)

## Impact

- **新增文件**:
  - `web/src/contexts/SelectedNodeContext.jsx`
  - `web/src/hooks/useShortcuts.js`
  - `web/src/pages/settings/ShortcutsModal.jsx`
  - `web/src/components/ui/confirm-dialog.tsx`

- **修改文件**:
  - `App.jsx`: 添加 Context Provider 和全局快捷键监听
  - `NodeCustom.jsx`: 单击选中、双击进入编辑器
  - `MindMap.jsx`: 选中状态、居中、删除确认
  - `Note.jsx`: Esc 返回、Ctrl+N 新建子节点
  - `Settings.jsx`: 快捷键入口和弹窗
  - `electron/common/settings.cjs`: shortcuts 默认值

- **依赖**: lucide-react (已使用), nanoid (已使用)