# fix-code-block-display Specification

## Purpose

修复代码块预览被分割成多个单行块的问题。

## Requirements

### Requirement: 代码块作为整体显示

代码块 SHALL 作为一个整体在预览框内显示，而不是被分割成多行。

#### Scenario: 代码块预览
- **WHEN** 用户输入 ```javascript\nconst a = 1;\nconst b = 2;\n```
- **THEN** 整个代码块显示在一个 `<pre>` 框内，包含所有内容