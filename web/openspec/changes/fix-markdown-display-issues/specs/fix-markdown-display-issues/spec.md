# fix-markdown-display-issues Specification

## Purpose

修复 Markdown 预览的 3 个显示问题。

## Requirements

### Requirement: 代码块作为整体显示

多行代码块 SHALL 显示为一个整体框，而非多个独立边框。

#### Scenario: 多行代码块预览
- **WHEN** 用户输入 ```javascript\nconst a = 1;\nconst b = 2;\n```
- **THEN** 整个代码块显示在一个 `<pre>` 边框内

### Requirement: 列表序号间隔适当

有序/无序列表的序号与文字间隔 SHALL 约为 1-2 个空格。

#### Scenario: 列表间隔
- **WHEN** 用户输入 `- item` 或 `1. item`
- **THEN** 序号与文字间隔约 1-2 个空格（不过大）

### Requirement: 引用块回车自动继续

引用块 SHALL 支持回车自动继续 `>` 标记。

#### Scenario: 引用块回车继续
- **WHEN** 用户输入 `> line1` 后按回车
- **THEN** 自动生成 `> line2` 并将光标置于 `line2` 位置

#### Scenario: 空引用行结束
- **WHEN** 用户输入 `> ` 后按回车（只有 `>` 没有内容）
- **THEN** 删除 `>` 并结束引用，生成普通段落