## Context

代码块（```code```）在预览时被分割成多个单行块。问题可能在于：
1. Lezer 的 FencedCode 节点可能只包含围栏标记，不包含内容
2. 或者遍历时错误地处理了 FencedCode 的子节点

## Goals / Non-Goals

**Goals:**
- 代码块作为一个整体在预览中显示在一个框内
- 围栏标记（```）被隐藏，内容正常显示

**Non-Goals:**
- 不修改代码块的语法高亮功能
- 不处理代码块嵌套（一个代码块内再套代码块）

## Decisions

### 1. 检查 FencedCode 节点结构

FencedCode 在 Lezer 中应该包含：
- 围栏开始标记（```xxx\n）
- 内容（多行）
- 围栏结束标记（```）

如果结构不对，需要调整遍历逻辑。

### 2. CSS 包裹

使用 `display: block` 确保代码块内容不被分割。