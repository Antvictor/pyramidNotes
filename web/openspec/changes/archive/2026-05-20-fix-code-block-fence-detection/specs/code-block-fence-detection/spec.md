## ADDED Requirements

### Requirement: Code Block Detection Based on Document Text Only

代码块检测 SHALL 完全基于 `view.state.doc` 的文本内容，不依赖 DOM 渲染状态或光标位置。

#### Scenario: Detection uses document line numbers
- **WHEN** 文档包含有序列表后跟代码块
- **THEN** 代码块的 fence 被正确识别
- **AND** `in-code-block` class 被应用到正确的行

### Requirement: Fence Detection is Stable Across Cursor Movement

当光标在各种块类型（列表、引用、标题、代码块）之间移动时，代码块的 fence 样式 SHALL 保持正确。

#### Scenario: Cursor on ordered list doesn't affect code block
- **WHEN** 光标在有序列表行 `1. item`
- **THEN** 后续代码块的 ``` 仍然有 `in-code-block` class

#### Scenario: Cursor on unordered list doesn't affect code block
- **WHEN** 光标在无序列表行 `- item`
- **THEN** 后续代码块的 ``` 仍然有 `in-code-block` class

#### Scenario: Cursor on blockquote doesn't affect code block
- **WHEN** 光标在引用行 `> quote`
- **THEN** 后续代码块的 ``` 仍然有 `in-code-block` class

#### Scenario: Cursor on heading doesn't affect code block
- **WHEN** 光标在标题行 `# Heading`
- **THEN** 后续代码块的 ``` 仍然有 `in-code-block` class

#### Scenario: Cursor on code block content doesn't affect fences
- **WHEN** 光标在代码块内容行
- **THEN** 代码块的所有行（包括 fence）都有 `in-code-block` class

### Requirement: Multiple Code Blocks are Independent

多个代码块在文档中连续出现时，SHALL 各自独立检测，不互相干扰。

#### Scenario: Multiple code blocks with list between
- **WHEN** 文档内容为 ` ``` `, `code1`, ` ``` `, `- list`, ` ``` `, `code2`, ` ``` `
- **THEN** 第一个代码块有 `in-code-block` class
- **AND** 第二个代码块有 `in-code-block` class
- **AND** 有序列表行没有 `in-code-block` class

### Requirement: DOM Line Count Matches Document Line Count

代码块检测时，DOM 中的 `.cm-line` 数量 SHALL 与 `view.state.doc.lines` 相等。

#### Scenario: Verify line count consistency
- **WHEN** `wrapCodeBlocks` 被调用
- **THEN** `cmLines.length === doc.lines`
- **OR** 如果不等，记录错误并跳过（不崩溃）