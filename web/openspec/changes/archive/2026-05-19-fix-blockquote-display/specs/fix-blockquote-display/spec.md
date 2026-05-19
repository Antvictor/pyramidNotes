# fix-blockquote-display Specification

## Purpose

修复引用块预览被分割成多个单行块的问题。

## Requirements

### Requirement: 引用块作为整体显示

连续的引用行 SHALL 合并在一个引用框内显示，而不是被分割成多行。

#### Scenario: 多行引用预览
- **WHEN** 用户输入：
  ```
  > line 1
  > line 2
  > line 3
  ```
- **THEN** 整个引用显示在一个 `<blockquote>` 框内