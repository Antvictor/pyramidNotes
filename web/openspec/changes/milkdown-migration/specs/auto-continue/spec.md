## ADDED Requirements

### Requirement: List Item Auto-continuation

列表项 SHALL 在按 Enter 时自动添加下一个列表项。

#### Scenario: Unordered list auto-continue
- **WHEN** 用户在 `- item1` 行按 Enter
- **THEN** 新行显示 `- ` 供用户继续输入

#### Scenario: Ordered list auto-continue
- **WHEN** 用户在 `1. item1` 行按 Enter
- **THEN** 新行显示 `2. ` 供用户继续输入

#### Scenario: Empty list item exits list
- **WHEN** 用户在空列表项（如 `- `）按 Enter
- **THEN** 该空项被删除，光标移动到新段落

### Requirement: Blockquote Auto-continuation

引用块 SHALL 在按 Enter 时自动添加下一个引用行。

#### Scenario: Blockquote auto-continue
- **WHEN** 用户在 `> quote1` 行按 Enter
- **THEN** 新行显示 `> ` 供用户继续输入

#### Scenario: Empty blockquote exits
- **WHEN** 用户在空引用行（如 `> `）按 Enter
- **THEN** 该空引用行被删除，光标移动到新段落

### Requirement: Code Block Continuation

代码块 SHALL 在按 Enter 时保持代码块内容。

#### Scenario: Enter inside code block
- **WHEN** 用户在代码块内部按 Enter
- **THEN** 新行保持缩进（在代码块内）

### Requirement: Double Enter Exits Block

连续两次按 Enter SHALL 退出当前块结构。

#### Scenario: Double enter on list
- **WHEN** 用户在列表项按 Enter，然后立即再次按 Enter
- **THEN** 退出列表，光标移动到新段落

#### Scenario: Double enter on blockquote
- **WHEN** 用户在引用行按 Enter，然后立即再次按 Enter
- **THEN** 退出引用块，光标移动到新段落

### Requirement: Tab Indentation in List

列表项 SHALL 支持 Tab 键进行缩进。

#### Scenario: Tab increases indent
- **WHEN** 用户在列表项内按 Tab
- **THEN** 列表项内容被缩进