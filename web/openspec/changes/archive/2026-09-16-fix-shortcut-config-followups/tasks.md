## 1. 补齐默认值（回归修复）

- [x] 1.1 `electron/common/settings.cjs`：`DEFAULT_SETTINGS.shortcuts.note` 补回
  `extractNode: 'Ctrl+Shift+M'` / `find: 'Ctrl+F'` / `replace: 'Ctrl+R'`

## 2. 清空即禁用

- [x] 2.1 `Node.jsx`：去掉 `keyBindings` 里三处 `|| "Ctrl+…"` 兜底

## 3. 冲突检测

- [x] 3.1 `ShortcutsModal.jsx`：新增 `findConflict` / `applyShortcut` / `confirmConflict`
- [x] 3.2 `handleShortcutChange` 命中冲突时弹确认框；确认后清空冲突项并写入新键；锁定项只提示不分配
- [x] 3.3 「未绑定」占位（`renderShortcutValue`，空值显示 `t("shortcuts.unbound")` 并置灰）
- [x] 3.4 输入框 `onChange` 改走 `applyShortcut`（打字不弹窗）
- [x] 3.5 i18n：`shortcuts.unbound`、`shortcuts.conflict.{title,message,lockedMessage}`

## 4. 锁定项展示与文案

- [x] 4.1 锁定项渲染为 `实际按键 [锁定]`
- [x] 4.2 `shortcuts.actions.backToMap`：「返回思维导图」→「返回」（en：`Back to mind map` → `Back`）

## 5. 搜索跳转来源

- [x] 5.1 `Node.jsx` 的 `handleSelectSearchResult` 跳转带 `state: { fromNote: id }`

## 6. 验证

- [x] 6.1 `node --check electron/common/settings.cjs`；i18n 中英一致（14/14）；改动文件 lint 干净
- [x] 6.2 `npx vite build` 通过
- [x] 6.3 手动：note 页 7 行可配置；冲突弹窗（含锁定项提示）；清空后键真正失效并显示「未绑定」；
  锁定行显示「返回　Escape [锁定]」；编辑器内搜索跳转后 ESC 回来源笔记；改键/保存/重置正常
