# fix-ordered-list-number Specification

## Purpose

修复有序列表序号显示问题。

## Requirements

### Requirement: 有序列表显示序号

有序列表 SHALL 显示为 `1. 2. 3.` 格式。

#### Scenario: 有序列表预览
- **WHEN** 用户输入 `1. item1\n2. item2`
- **THEN** 预览显示 `1. item1` 和 `2. item2`