# fix-shortcut-config-followups Specification

## Purpose

修复快捷键配置的三类问题（默认值缺失、清空不生效、无法防冲突），
并让编辑器内搜索跳转的来源语义与引用跳转一致。

## Requirements

### Requirement: 编辑器快捷键可在设置中配置

设置界面 SHALL 列出全部编辑器快捷键（`bold` / `italic` / `heading1` / `heading2` /
`extractNode` / `find` / `replace`），且每一行 SHALL 可编辑。

### Requirement: 清空的绑定不生效

快捷键绑定的值 SHALL 只来自设置，SHALL NOT 在消费侧用 `||` 兜底还原默认值。
绑定值为空时，该快捷键 SHALL NOT 触发对应动作。

### Requirement: 防止快捷键冲突

录入一个已被其它动作占用的按键时，系统 SHALL 弹出提示，指明占用该键的动作。

用户确认后，系统 SHALL 清空**被占用动作**的绑定，并把新键赋给当前动作；
用户取消时 SHALL NOT 修改任何绑定。

锁定项（`backToMap`）SHALL NOT 被清空；当其占用目标按键时，系统 SHALL 只提示、SHALL NOT 分配。

被清空的绑定 SHALL 显示为「未绑定」。

### Requirement: 锁定项显示实际按键

被锁定的快捷键行 SHALL 同时显示其绑定的按键值与锁定标记（如 `Escape [锁定]`）。

### Requirement: 编辑器内搜索跳转保留来源

在笔记页通过搜索跳转到另一节点时，系统 SHALL 记录来源笔记；
随后按返回快捷键 SHALL 返回**来源笔记**，而非思维导图。
