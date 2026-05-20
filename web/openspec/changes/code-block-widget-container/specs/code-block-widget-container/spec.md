# code-block-widget-container Specification

## ADDED Requirements

### Requirement: Code Block Uses Mark + DOM Wrapper

代码块 SHALL 使用 Mark decoration + DOM Wrapper 结合的方式实现样式预览。

#### Scenario: Multi-line code block with empty line
- **WHEN** 用户输入：
  ```
  ```
  line 1

  line 3
  ```
  ```
- **THEN** Mark decoration 标记内容范围（实时同步）
- **AND** DOM Wrapper 包裹整个代码块（包括空行）
- **AND** 空行区域有与其他行相同的背景色

#### Scenario: Single line code block
- **WHEN** 用户输入：
  ```
  ```single line```
  ```
- **THEN** Mark decoration 标记内容范围
- **AND** DOM Wrapper 包裹代码块
- **AND** 代码块显示统一边框

#### Scenario: Real-time preview synchronization
- **WHEN** 用户在代码块内输入新内容
- **THEN** Mark decoration 立即同步到编辑器 DOM
- **AND** 用户看到的内容与输入同步（无延迟）
- **AND** Wrapper 背景同步应用到新内容

### Requirement: Empty Lines Within Code Block

空行 SHALL 在 Wrapper 容器内正确显示背景色。

#### Scenario: Empty line between content lines
- **WHEN** 代码块中间有空行
- **THEN** 空行的 `<br>` 所在区域显示为背景色（不是透明或白色）
- **AND** 空行区域左右边框保持连贯
- **AND** 空行不影响代码块的视觉连续性

**原理：**
```
DOM 结构：
<div class="md-code-block-wrapper">    ← Wrapper 提供背景
  <div class="cm-line"><br></div>   ← 空行，继承 wrapper 背景
</div>
```

### Requirement: Fence Visibility Based on Cursor Position

Fence 标记（```）的可见性 SHALL 根据光标位置动态控制。

#### Scenario: Fence hidden by default
- **WHEN** 代码块刚创建且光标不在 fence 行
- **THEN** fence 标记不可见（opacity: 0）
- **AND** 代码块内容正常显示

#### Scenario: Fence visible when cursor on fence line
- **WHEN** 用户将光标移动到 ``` 行
- **THEN** fence 标记变为可见（opacity: 1）
- **AND** 用户可以看到正在编辑 fence 标记

#### Scenario: Fence hidden when cursor leaves
- **WHEN** 光标从 ``` 行移动到内容行
- **THEN** fence 标记恢复为不可见
- **AND** 代码块样式保持不变

### Requirement: Editor Interaction Unaffected

编辑器交互 SHALL 不受 Wrapper 影响。

#### Scenario: Cursor movement works normally
- **WHEN** 用户在代码块内移动光标
- **THEN** 光标可以正常进入、停留在、离开代码块的任意位置
- **AND** fence 可见性根据光标位置正确变化

#### Scenario: Text editing works normally
- **WHEN** 用户在代码块内输入、删除、修改文本
- **THEN** 文本正确更新到编辑器文档
- **AND** Wrapper 不干扰编辑操作

#### Scenario: Selection works normally
- **WHEN** 用户选择代码块内的文本
- **THEN** 选区高亮正常显示
- **AND** Wrapper 不阻挡选择操作

## Technical Notes

### Mark Decoration (已有)
- FencedCode 节点应用 `md-code-block-content` mark
- fence 标记应用 `md-syntax` mark
- 内容实时同步，无延迟

### DOM Wrapper (新增)
- 在 decoration 应用后，遍历 DOM 检测连续的代码块行
- 使用 `insertBefore`/`appendChild` 包装，不修改 editor state
- Wrapper 仅提供背景和边框样式

### CSS :has() (已有)
```css
/* 当光标在 fence 行时显示 fence 标记 */
.cm-line:has(.md-syntax:not(.md-code-block-content)) .md-fence-start,
.cm-line:has(.md-syntax:not(.md-code-block-content)) .md-fence-end {
    opacity: 1;
}
```

### Wrapper 样式
```css
.md-code-block-wrapper {
    display: block;
    background: var(--color-code-bg);
    border: 1px solid var(--color-code-border);
    border-radius: var(--radius);
    margin: var(--spacing-block) 0;
}
```
