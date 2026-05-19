## Context

当前 CSS 样式存在以下问题：
1. `.md-blockquote-content` 使用 `display: inline` 导致边框分段
2. 列表和引用块 padding-left 太大
3. 有序列表 `list-style-type: decimal` 需要正确设置

## Goals / Non-Goals

**Goals:**
- 引用块边框连接为一个整体
- 减少列表和引用块的左侧间距
- 有序列表显示正确序号

**Non-Goals:**
- 不修改列表项的嵌套级别样式（那是 CSS 变量问题）