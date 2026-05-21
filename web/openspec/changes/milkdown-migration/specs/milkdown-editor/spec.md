## ADDED Requirements

### Requirement: Milkdown Editor Initialization

编辑器 SHALL 支持通过配置初始化，支持传入 content、onChange 回调和 keyBindings。

#### Scenario: Basic initialization
- **WHEN** 调用 `Editor.make(milkdownConfig)` 并传入 editor container
- **THEN** 编辑器实例被创建并挂载到 container
- **AND** 传入的 initial content 被渲染

#### Scenario: Content changes trigger callback
- **WHEN** 用户在编辑器中输入或修改内容
- **THEN** `onChange` 回调被调用，传入当前文档的 Markdown 文本

#### Scenario: Key bindings are applied
- **WHEN** 编辑器初始化时传入了 keyBindings
- **THEN** 自定义快捷键被正确绑定

### Requirement: WYSIWYG Markdown Rendering

编辑器 SHALL 在编辑时直接显示渲染后的 Markdown 内容，而不是源码。

#### Scenario: Heading renders as h1
- **WHEN** 用户输入 `# Heading`
- **THEN** 编辑器显示 `<h1>Heading</h1>` 的渲染效果
- **AND** 用户看到的是格式化后的标题，不是 `# Heading` 源码

#### Scenario: Blockquote renders as blockquote
- **WHEN** 用户输入 `> quote`
- **THEN** 编辑器显示 `<blockquote>quote</blockquote>` 的渲染效果

#### Scenario: List items render as list
- **WHEN** 用户输入 `- item1` 和 `- item2`
- **THEN** 编辑器显示 `<ul><li>item1</li><li>item2</li></ul>` 的渲染效果

### Requirement: Cursor Position Editing

编辑器 SHALL 支持光标所在位置的源码编辑，光标离开后显示渲染效果。

#### Scenario: Cursor on heading shows source
- **WHEN** 光标在标题行
- **THEN** 该行显示源码（如 `# Heading`）以便编辑

#### Scenario: Cursor leaves heading shows rendered
- **WHEN** 光标离开标题行
- **THEN** 该行显示渲染后的标题

### Requirement: Node Selection and Styling

编辑器 SHALL 支持对 Markdown 节点（如 heading、blockquote、codeBlock）进行选中和应用样式。

#### Scenario: Code block displays with syntax highlighting
- **WHEN** 用户输入代码块
- **THEN** 代码块以 `<pre><code>` 形式渲染，带语法高亮

#### Scenario: Emphasis and strong text render correctly
- **WHEN** 用户输入 `*italic*` 或 `**bold**`
- **THEN** 文本以斜体或粗体显示