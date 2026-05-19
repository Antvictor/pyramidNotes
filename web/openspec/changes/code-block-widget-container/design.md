## Context

当前代码块使用 `Decoration.mark()` 实现样式预览，但存在根本性问题：

**CodeMirror 6 的 DOM 结构：**
```
<div class="cm-line">content<span class="md-code-block-content">code</span></div>
<div class="cm-line"><br></div>
<div class="cm-line">content<span class="md-code-block-content">more</span></div>
```

每个 `.cm-line` 是独立的一行，`<br>` 无法被标记，因此空行无法应用背景色。

## Goals / Non-Goals

**Goals:**
- 使用 BlockWidget 实现代码块的真正容器化
- 代码块（包括空行）有统一连续的视觉边框
- 不依赖 fence 标记提供边框

**Non-Goals:**
- 不改变代码块的语法解析逻辑
- 不改变其他 Markdown 元素的渲染方式

## Decisions

### Decision 1: 使用 BlockWidget 而非 mark decoration

**选择**：创建自定义 `CodeBlockWidget` 扩展 `WidgetType`

**理由**：
- `Decoration.mark()` 只能给已有内容添加样式，无法包裹多行
- `Decoration.widget()` 可以插入任意 DOM 元素作为容器
- Widget 可以包含 fence 标记作为视觉边框

**实现方式：**
```typescript
class CodeBlockWidget extends WidgetType {
    constructor(readonly content: string) {
        super();
    }

    toDOM(): HTMLElement {
        const wrapper = document.createElement('div');
        wrapper.className = 'md-code-block-wrapper';
        wrapper.innerHTML = `
            <div class="md-fence-start">\`\`\`</div>
            <pre class="md-code-block-content">${this.escapeHtml(this.content)}</pre>
            <div class="md-fence-end">\`\`\`</div>
        `;
        return wrapper;
    }

    eq(other: CodeBlockWidget): boolean {
        return other.content === this.content;
    }
}
```

### Decision 2: 保持 fence 标记为可见内容

**选择**：Widget 内部的 fence 标记保持可见（颜色透明但占位）

**理由**：
- 保持代码块结构完整性
- 便于调试和查看源码

## Risks / Trade-offs

1. **性能风险** → Widget 创建额外 DOM 元素，可能影响大量代码块的渲染性能
   - **缓解**：仅在需要时创建，不频繁更新

2. **编辑交互风险** → Widget 可能影响光标定位和文本选择
   - **缓解**：正确实现 `coords` 和 `ignoreEvent` 方法

3. **样式同步风险** → Widget 内容与编辑器内容不同步
   - **缓解**：监听文档变化，及时重建 Widget

## Open Questions

1. Widget 内部的文本是否应该可编辑？如果可编辑，如何与主编辑器同步？
2. 是否需要在 Widget 和原始 fence 标记之间保持双向同步？

## Architecture

```
┌─────────────────────────────────────────────┐
│ markdownDecoration.ts                        │
│                                              │
│  FencedCode 节点处理                         │
│       │                                      │
│       ▼                                      │
│  ┌─────────────────────────────────────┐     │
│  │ Decoration.widget({                  │     │
│  │   widget: new CodeBlockWidget(...)  │     │
│  │   side: -1                           │     │
│  │ })                                   │     │
│  └─────────────────────────────────────┘     │
│                                              │
│  CodeBlockWidget.toDOM()                     │
│       │                                      │
│       ▼                                      │
│  ┌─────────────────────────────────────┐     │
│  │ <div class="md-code-block-wrapper"> │     │
│  │   <div class="md-fence-start"></div>│     │
│  │   <pre class="md-code-content">     │     │
│  │     actual code lines...            │     │
│  │   </pre>                            │     │
│  │   <div class="md-fence-end"></div>  │     │
│  └─────────────────────────────────────┘     │
└─────────────────────────────────────────────┘
```