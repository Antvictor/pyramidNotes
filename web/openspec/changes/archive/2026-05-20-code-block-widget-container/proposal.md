## Why

当前 Markdown 代码块使用 `Decoration.mark()` 来添加样式，但这种方式的局限性：
1. `Decoration.mark()` 只能在已有 DOM 元素上添加 inline 样式，无法改变 DOM 结构
2. 代码块内容跨越多行时，每行分散在不同的 `.cm-line` 元素中
3. 空行（只有 `<br>`）无法被标记，因此无法应用背景色，导致视觉上被"切割"

## What Changes

- **新增** CodeBlockWidget 类，用于包裹整个代码块
- **重构** markdownDecoration.ts 中 FencedCode 的处理逻辑
- **使用** `Decoration.widget()` 替代 `Decoration.mark()` 来包裹代码块内容
- **移除** fence 标记的单独样式（通过 Widget 边框代替）

## Capabilities

### New Capabilities

- `code-block-widget-container`：使用 BlockWidget 包裹代码块，实现真正的容器化

### Modified Capabilities

- `syntax-tree-markdown-editor`：代码块渲染方式改变

## Impact

- **代码**：
  - `src/core/editor/core/plugins/markdownDecoration.ts` - 修改 FencedCode 处理逻辑
  - `src/core/editor/core/plugins/codeBlock.ts` - 新增 CodeBlockWidget 类
  - `src/core/editor/css/code-block/styles.css` - 简化样式，移除 fence 标记样式
- **风险**：BlockWidget 可能与现有编辑交互有影响，需要测试验证