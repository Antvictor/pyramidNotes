## ADDED Requirements

### Requirement: Code Block Detection

代码块 SHALL 通过 Markdown 围栏语法（```）正确检测。

#### Scenario: Simple code block
- **WHEN** 文档包含 ``` 后跟内容再跟 ```
- **THEN** 整个代码块区域被识别为一个代码块节点

#### Scenario: Code block with language
- **WHEN** 围栏后指定了语言（如 ```javascript）
- **THEN** 语言信息被提取并存储在节点的 language 属性中

#### Scenario: Multiple code blocks
- **WHEN** 文档包含多个代码块
- **THEN** 每个代码块被独立检测和渲染

### Requirement: Prism Syntax Highlighting

代码块 SHALL 使用 Prism 进行语法高亮。

#### Scenario: JavaScript code highlighting
- **WHEN** 用户输入 ```javascript 并包含 JavaScript 代码
- **THEN** 代码使用 JavaScript 语法高亮

#### Scenario: Python code highlighting
- **WHEN** 用户输入 ```python 并包含 Python 代码
- **THEN** 代码使用 Python 语法高亮

#### Scenario: Unknown language falls back
- **WHEN** 代码块指定了不支持的语言
- **THEN** 代码以纯文本形式显示，无语法高亮

### Requirement: Line Numbers Display

代码块 SHALL 支持可选的行号显示。

#### Scenario: Line numbers enabled
- **WHEN** 配置中启用了 lineNumbers
- **THEN** 代码块左侧显示行号

#### Scenario: Line numbers disabled
- **WHEN** 配置中禁用了 lineNumbers
- **THEN** 代码块不显示行号

### Requirement: Code Block Theme

代码块 SHALL 支持主题定制。

#### Scenario: Custom background color
- **WHEN** 配置中指定了 codeBlockBackground
- **THEN** 代码块使用指定的背景色

#### Scenario: Custom font family
- **WHEN** 配置中指定了 codeBlockFontFamily
- **THEN** 代码内容使用指定的等宽字体