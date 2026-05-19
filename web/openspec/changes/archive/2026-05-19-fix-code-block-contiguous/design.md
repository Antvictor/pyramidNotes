## Context

代码块预览目前是一行一个框。问题在于每行代码都应用了独立的 `.md-code-block-content` 样式，导致多个边框而非一个整体边框。

## Goals / Non-Goals

**Goals:**
- 代码块作为一个整体框显示
- 上边框紧挨着 ```，下边框紧挨着 ```

**Non-Goals:**
- 不修改代码块语法高亮

## Decisions

### CSS display: block vs inline

当前使用 `display: block`，但需要确保整体框而非每行一个框。可能需要调整 margin/padding 使边框紧邻内容。