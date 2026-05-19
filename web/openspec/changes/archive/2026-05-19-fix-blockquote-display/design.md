## Context

引用块（> quote）在预览时被分割成多个单行块。Lezer 解析多行引用为嵌套结构：
- Blockquote
  - Paragraph (line 1)
  - Paragraph (line 2)
  - ...

每个 Paragraph 都是独立的 ListItem，导致预览时被分割。

## Goals / Non-Goals

**Goals:**
- 连续的 > 引用行合并在一个引用框内显示
- 引用的语法标记（>）被隐藏

**Non-Goals:**
- 不处理嵌套引用块（>>）
- 不处理引用块内的列表

## Decisions

### 1. Blockquote 节点结构

Blockquote 节点包含多个 Paragraph 子节点，每个 Paragraph 是一行。

### 2. 解决方案

在 Blockquote 节点上添加 `skip: true` 跳过子节点处理，整个引用块作为整体处理。