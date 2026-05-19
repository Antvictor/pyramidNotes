# code-block-widget-container Specification

## ADDED Requirements

### Requirement: Code Block Uses Widget Container

代码块 SHALL 使用 BlockWidget 包裹，实现真正的容器化渲染。

#### Scenario: Multi-line code block with empty line
- **WHEN** 用户输入：
  ```
  ```
  line 1

  line 3
  ```
  ```
- **THEN** 整个代码块（包括空行）显示在一个统一的边框容器内
- **AND** 空行区域有与其他行相同的背景色和边框

#### Scenario: Single line code block
- **WHEN** 用户输入：
  ```
  ```single line```
  ```
- **THEN** 代码块显示在一个统一边框容器内

#### Scenario: Code block with syntax highlighting
- **WHEN** 用户输入带语法高亮的代码块
- **THEN** 语法高亮正常显示在 Widget 容器内

### Requirement: Widget Maintains Visual Consistency

Widget 容器 SHALL 保持与当前方案 B 相同的视觉样式。

#### Scenario: Fence markers provide visual borders
- **WHEN** 代码块渲染时
- **THEN** fence 标记区域提供上下边框，内容区域提供左右边框
- **AND** 边框颜色和圆角与当前样式一致

### Requirement: Empty Lines Within Code Block

空行 SHALL 在 Widget 容器内正确显示背景色。

#### Scenario: Empty line between content lines
- **WHEN** 代码块中间有空行
- **THEN** 空行显示为背景色（不是透明或白色）
- **AND** 空行区域左右边框保持连贯

## Technical Notes

- 使用 `Decoration.widget()` 替代 `Decoration.mark()` 来包裹代码块
- `CodeBlockWidget` 类继承 `WidgetType`
- Widget 的 DOM 结构：
  ```html
  <div class="md-code-block-wrapper">
    <div class="md-fence-start">```</div>
    <pre class="md-code-content">...</pre>
    <div class="md-fence-end">```</div>
  </div>
  ```
- `toDOM()` 方法返回完整的包裹 DOM
- `eq()` 方法基于内容判断是否需要重建 Widget