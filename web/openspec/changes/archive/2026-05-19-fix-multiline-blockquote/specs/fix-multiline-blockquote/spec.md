# fix-multiline-blockquote Specification

## Purpose

明确多行引用的行为规范。

## Requirements

### Requirement: 多行引用行为

在 Markdown 中，引用块内每一行都必须有 `>` 前缀。没有 `>` 的行不是引用的一部分。

#### Scenario: 多行引用
- **WHEN** 用户输入：
  ```
  > line 1
  > line 2
  > line 3
  ```
- **THEN** 整个内容显示为一个引用块（这是正确的 Lezer 解析）

#### Scenario: 混行引用（行为说明）
- **WHEN** 用户输入：
  ```
  > line 1
  line 2 (无 >)
  > line 3
  ```
- **THEN** `line 1` 和 `line 3` 各自在独立的引用块内，`line 2` 不是引用
  （这是 Markdown 规范行为，非 bug）