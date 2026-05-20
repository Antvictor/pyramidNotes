## ADDED Requirements

### Requirement: Code Block Detection Uses Document Line Numbers

代码块边界检测 SHALL 完全基于 `view.state.doc` 中的行号和行文本，不依赖 DOM 查询顺序。

### Requirement: Code Block Class Application is Stable

当光标在有序列表行（如 `1. 1` 或 `2. 2`）时，代码块的 fence 标记 SHALL 仍然正确获得 `in-code-block` class。

#### Scenario: Cursor on ordered list before code block
- **WHEN** 用户在有序列表行 `1. 1` 上移动光标
- **THEN** 代码块的 fence 标记仍然有 `in-code-block` class
- **AND** 代码块背景色正确显示

#### Scenario: Cursor on ordered list between code blocks
- **WHEN** 用户在有序列表行 `2. 2` 上移动光标（两个代码块之间）
- **THEN** 两个代码块的 fence 标记仍然有 `in-code-block` class
- **AND** 两个代码块各自的样式正确显示

#### Scenario: Cursor moves between list and code block
- **WHEN** 用户将光标从有序列表行移动到代码块内容行
- **THEN** 代码块样式持续正确显示
- **AND** `in-code-block` class 不受光标位置影响

### Requirement: Modulo-based Boundary Detection

代码块边界 SHALL 使用 triple-backtick 出现次数的 modulo 检测：
- 第 1、3、5... 个 ` ``` ` 标记上边界
- 第 2、4、6... 个 ` ``` ` 标记下边界

#### Scenario: Simple code block
- **WHEN** 文档内容为 ` ``` `, `code`, ` ``` `
- **THEN** 所有三行都有 `in-code-block` class

#### Scenario: Code block with ordered list inside
- **WHEN** 文档内容为 `1. 1`, `2. 2`, ` ``` `, `code`, ` ``` `
- **THEN** 代码块的两行 fence 和内容行都有 `in-code-block` class
- **AND** 有序列表行没有 `in-code-block` class