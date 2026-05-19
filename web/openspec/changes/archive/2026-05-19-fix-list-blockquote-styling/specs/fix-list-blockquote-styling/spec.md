# fix-list-blockquote-styling Specification

## Purpose

修复列表和引用块的样式显示问题。

## Requirements

### Requirement: 引用块边框连续

引用块 SHALL 显示为一个整体，左边框连续不断开。

#### Scenario: 多行引用
- **WHEN** 用户输入多行引用
- **THEN** 左边框显示为一个连续的竖线

### Requirement: 有序列表序号

有序列表 SHALL 显示为 `1. 2. 3.` 格式，而非只有 `.`

#### Scenario: 有序列表显示
- **WHEN** 用户输入 `1. item1\n2. item2`
- **THEN** 预览显示 `1. item1\n2. item2`

### Requirement: 减少左侧间距

无序列表、有序列表、引用块的左侧间距 SHALL 减小。

#### Scenario: 间距调整
- **WHEN** 用户编辑列表或引用
- **THEN** 文字与左侧边缘的间距适当（不过大）