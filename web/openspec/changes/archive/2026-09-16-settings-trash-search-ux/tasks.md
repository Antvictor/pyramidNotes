## 1. 快捷键默认值收敛 + searchFullText

- [x] 1.1 `electron/common/settings.cjs`：新增 `mergeShortcuts`，`loadSettings` 与 `saveSettings` 都归一化 `shortcuts`；`DEFAULT_SETTINGS.shortcuts.global` 增加 `searchFullText: 'Ctrl+Shift+K'`
- [x] 1.2 `App.jsx`：删除本地 `DEFAULT_SHORTCUTS` 与 `mergeShortcutsWithDefaults`（含 `onSettingsChanged` 调用点），直接用 `settings.shortcuts`
- [x] 1.3 `ShortcutsModal.jsx`：删除本地副本；`useState(null)` + 渲染守卫；`globalLabels` 增加 `searchFullText`；「重置」改为 `saveSettings({ shortcuts: {} })` + 重载
- [x] 1.4 i18n：`shortcuts.actions.searchFullText`（中/英）

## 2. 数字输入清空跳值

- [x] 2.1 新增 `web/src/components/ui/number-field.jsx`（编辑期本地字符串，失焦/回车提交并夹取；非法值回到原值）
- [x] 2.2 `Settings.jsx` 三处（保留期 / 系统字号 / 笔记字号）改用 `NumberField`，原样式原样保留

## 3. 回收站多选彻底删除

- [x] 3.1 `electron/ipc/trash.cjs`：新增 `purgeTrashNodes`（整簇、无条件物理删除、单事务）+ 注册 + 导出
- [x] 3.2 `electron/preload.cjs`：暴露 `purgeTrashNodes`
- [x] 3.3 `Trash.jsx`：每行复选框 + 表头全选 + 「彻底删除」按钮（未选中禁用）+ 警告确认弹窗
- [x] 3.4 i18n：`trash.selectAll` / `trash.permanentDelete` / `trash.permanentDeleteWarning`

## 4. 全文搜索快捷键 + 弹窗 tab 切换

- [x] 4.1 `node-search.tsx`：`activeTab` 受控（`activeTab` + `onActiveTabChange`，内部 state 兜底）；`NodeSearchDialog` 透传
- [x] 4.2 `MindMap.jsx`：`searchTab` state；搜索键判断移到 `searchOpen` 守卫之前；主搜索弹窗接 tab props（移动目标弹窗不接）
- [x] 4.3 `Node.jsx`：同上（`matchShortcut`，判断移到守卫之前）
- [x] 4.4 `App.jsx`：删除死代码（`searchOpen` state、写死的 Ctrl+K 分支、`MindMapWrapper` 上多余的两个 prop）

## 5. 验证

- [x] 5.1 web 非-DOM 测试 36/36；`trashUtils` + `locale` 10/10；`schema`（electron ABI）4/4
- [x] 5.2 `npx vite build` 通过；改动文件 lint 干净，`MindMap.jsx` 回到基线（仅剩 2 个既有 error）
- [x] 5.3 手动：数字输入清空不跳值并可正常保存；快捷键可改且重置生效；
  `Ctrl+Shift+K` / `Ctrl+K` 开弹窗与切 tab；回收站多选彻底删除无孤儿；回归正常
