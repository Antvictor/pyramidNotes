# fix-unordered-list-display Specification

## Purpose

修复无序列表（`-` 或 `+` 标记）在预览时显示黑色圆点（•）而不是原始语法符号。

## Requirements

### Requirement: 无序列表显示黑色圆点

使用 `-` 或 `+` 标记的无序列表 SHALL 显示为标准的黑色圆点（•），而非原始语法符号。

#### Scenario: 无序列表预览
- **WHEN** 用户编辑 `- item`
- **THEN** 预览显示 `• item`，其中 `•` 是黑色圆点，`item` 是列表内容

#### Scenario: 使用 + 标记的无序列表
- **WHEN** 用户编辑 `+ item`
- **THEN** 预览同样显示 `• item`（圆点）

#### Scenario: 嵌套无序列表
- **WHEN** 用户编辑嵌套的无序列表
- **THEN** 外层显示圆点 `•`，内层显示空心圆 `◦`