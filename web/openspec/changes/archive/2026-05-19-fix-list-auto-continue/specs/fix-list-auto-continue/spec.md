# fix-list-auto-continue Specification

## Purpose

实现 Markdown 列表项回车自动继续功能，支持多种列表格式。

## Requirements

### Requirement: 回车自动继续无序列表

在无序列表项后按回车 SHALL 自动生成下一个无序列表项标记。

#### Scenario: 无序列表自动继续
- **WHEN** 用户输入 `- item1` 后按回车
- **THEN** 生成 `- item2\n` 并将光标置于 `item2` 位置

#### Scenario: 使用 + 标记的无序列表
- **WHEN** 用户输入 `+ item1` 后按回车
- **THEN** 同样生成 `+ ` 继续

### Requirement: 回车自动继续有序列表

在有序列表项后按回车 SHALL 自动生成下一个有序列表项标记。

#### Scenario: 有序列表自动继续（点号格式）
- **WHEN** 用户输入 `1. item1` 后按回车
- **THEN** 生成 `2. item2\n`

#### Scenario: 有序列表自动继续（括号格式）
- **WHEN** 用户输入 `1) item1` 后按回车
- **THEN** 生成 `2) item2\n`

### Requirement: 回车两次取消列表

连续按两次回车 SHALL 取消列表继续，生成普通段落。

#### Scenario: 回车两次取消
- **WHEN** 用户输入 `- item` 后连续按两次回车
- **THEN** 第一次回车生成 `- `，第二次回车生成普通段落（无列表标记）