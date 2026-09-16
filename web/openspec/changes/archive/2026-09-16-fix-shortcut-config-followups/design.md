## Context

上一变更把快捷键默认值收敛为 electron 单一来源，但两份前端副本的 `note` 段**键集合与 electron 不一致**：
前端有 7 个（`bold/italic/heading1/heading2/extractNode/find/replace`），electron 只有 4 个。
收敛时只搬了常量、没有对齐键集合 —— 这是本次要修的真实回归。

## Goals / Non-Goals

**Goals:**
- 设置界面能配置**全部**编辑器快捷键
- 清空一个绑定 = 真正禁用
- 重复绑定有明确提示与确定行为
- 编辑器内搜索跳转的来源语义与引用跳转一致

**Non-Goals:**
- 不把 TipTap 内置快捷键（撤销/重做、行内代码、删除线、列表、引用、代码块等）接入配置
- 不改动 `matchEditorShortcut` / `matchKey` / `matchShortcut` 的匹配逻辑 —— 它们对空串已正确守卫
- 不做冲突检测的"手打字符串"路径（见 Decisions）

## Decisions

- **去掉逐键 `||` 兜底**：默认值的完整性由 electron 的深合并保证；
  逐键兜底只会让"清空"失效（`'' || "Ctrl+F"` → `"Ctrl+F"`）。
- **冲突处理：确认后清空「冲突项」**。锁定项（`backToMap`）**不可被清空** ——
  若冲突对象是锁定项，则只提示、不分配（否则 ESC 会失效）。
- **冲突检测只作用于「按键录入」路径**：输入框 `onChange` 逐字符触发，若在 `handleShortcutChange`
  里检测会在打字中途弹窗；因此输入框 `onChange` 走不检测的 `applyShortcut`，按键录入走 `handleShortcutChange`。
  代价：手打字符串不检测（次要路径）。
- **锁定项显示实际按键**（`Escape [锁定]`），否则用户看不出它绑的是什么；动作文案同步缩短为「返回」。
- **搜索跳转补 `state: { fromNote: id }`**，与 `openNode` 保持一致，使 ESC 回到来源笔记。
