# fix-code-block-contiguous Specification

## Purpose

修复代码块预览显示为一行一个框的问题。

## Requirements

### Requirement: 代码块作为整体框显示

代码块 SHALL 作为一个整体框显示，上边框紧挨着 ```，下边框紧挨着 ```。

#### Scenario: 代码块预览
- **WHEN** 用户输入 ```javascript\nconst a = 1;\nconst b = 2;\n```
- **THEN** 显示为一个整体 `<pre>` 框，不是多个单行框