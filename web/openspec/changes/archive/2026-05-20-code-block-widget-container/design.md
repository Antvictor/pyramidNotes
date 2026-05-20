## Context

当前代码块使用 `Decoration.mark()` 实现样式预览，但存在根本性问题：

**问题 1：空行无法显示背景色**
```
<div class="cm-line"><span class="md-code-block-content">```</span></div>
<div class="cm-line"><br></div>  ← 无法设置背景色
<div class="cm-line"><span class="md-code-block-content">code</span></div>
```

**问题 2：装饰被跳过导致样式丢失**
当光标在 fence 行时，`build()` 中的 `iterate()` 跳过该节点，fence class 被移除，wrapper 检测失效。

## Goals / Non-Goals

**Goals:**
- 解决空行背景色问题：空行应与代码块其他行有相同背景
- 代码块边界由 fence 数量决定，不受其他 block 类型影响
- 编辑器交互不受影响：光标、选择、编辑均正常工作
- fence 可见性由 CSS 控制：基于光标位置动态显示/隐藏

**Non-Goals:**
- 不改变代码块的语法解析逻辑
- 不改变其他 Markdown 元素的渲染方式
- 不使用 Widget 覆盖原内容（避免同步延迟）

## Decisions

### Decision 1: Modulo 计数判断 fence 边界

**选择**：按 ` ``` ` 出现的顺序计数，第 1、3、5... 个为上边界，第 2、4、6... 个为下边界

**理由**：
- 简单直观：第二个 ` ``` ` 出现就表示代码块结束
- 不受其他 block 影响：blockquote `>`、list `-`、heading `#` 都被视为普通内容
- 不依赖装饰器：即使光标在 fence 行导致装饰被跳过，也能正确检测

**边界规则：**
| 第 N 个 ``` | 角色 | CSS class |
|------------|------|----------|
| N % 2 = 1 (奇数) | 上边界 | md-fence-start |
| N % 2 = 0 (偶数) | 下边界 | md-fence-end |
| 中间行 | 代码块内容 | md-code-block-content |

### Decision 2: 直接检测 DOM 中的 ```

**选择**：遍历 `.cm-line` 元素，检测是否有 ` ``` ` pattern，用计数器跟踪位置

**理由**：
- 装饰可能被跳过（光标在 fence 行时），但 DOM 中原始文本仍在
- 不依赖 Mark decoration 是否应用
- 纯 DOM 操作，不影响 editor state

**实现方式：**
```typescript
function wrapCodeBlocks(view: EditorView): void {
    unwrapCodeBlocks(view);  // 先清理旧 wrapper

    const lines = view.dom.querySelectorAll('.cm-line');
    let fenceCount = 0;
    let wrapper: HTMLElement | null = null;
    let codeBlockStartLine = -1;

    for (const line of lines) {
        const text = line.textContent || '';
        const hasFence = /```/.test(text);

        if (hasFence) {
            fenceCount++;

            if (fenceCount % 2 === 1) {
                // 奇数：上边界 - 开始新的代码块
                wrapper = createWrapper();
                wrapper.appendChild(line);
            } else {
                // 偶数：下边界 - 结束当前代码块
                if (wrapper) {
                    wrapper.appendChild(line);
                }
                wrapper = null;
                fenceCount = 0;  // 重置，准备下一个代码块
            }
        } else if (wrapper) {
            // 没有 fence，但在代码块内
            wrapper.appendChild(line);
        }
    }
}
```

### Decision 3: 保持 Mark decoration 用于内容样式

**选择**：Mark decoration 仍然负责 `md-code-block-content` 等样式，wrapper 只负责容器背景

**理由**：
- 内容行的样式（字体、颜色）仍然通过 Mark decoration 应用
- wrapper 提供统一的背景色和边框
- 两者各司其职

```
.wrapper (背景/边框)
  └── .cm-line (Mark decoration 应用 md-code-block-content)
      └── content
```

### Decision 4: Fence 可见性由 CSS :has() 控制

**选择**：fence 默认隐藏，光标在 fence 行时显示

```css
.md-fence-start,
.md-fence-end {
    opacity: 0;
    transition: opacity 0.15s;
}

.cm-line:has(.md-fence-start),
.cm-line:has(.md-fence-end) {
    opacity: 1;
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  遍历 .cm-line 元素                                          │
│                                                              │
│  fenceCount = 0                                             │
│       │                                                     │
│       ▼                                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  line.textContent 包含 ``` ?                        │    │
│  └─────────────────────────────────────────────────────┘    │
│              │                        │                     │
│           YES │                    NO │                     │
│              ▼                        ▼                     │
│  fenceCount++                    在代码块内？                │
│       │                       (wrapper !== null)           │
│       ▼                                    │                 │
│  fenceCount % 2 === 1 ?                   ▼                 │
│       │                              wrapper.appendChild   │
│   ┌───┴───┐                                         │
│  YES    NO                                         │
│   │      │                                         │
│   ▼      ▼                                         │
│  开始wrapper  结束wrapper                           │
└─────────────────────────────────────────────────────────────┘
```

## Risks / Trade-offs

1. **内容中的 ``` 提前结束** → 用户在代码中写 ``` 可能提前结束
   - **缓解**：这是 markdown 固有限制，非本方案特有问题

2. **fence 长度不一致** → `` ``` `` vs ````````` 
   - **缓解**：modulo 按顺序计数，不关心长度

3. **性能** → 每次 update 都遍历所有 .cm-line
   - **缓解**：现代浏览器遍历几百个 DOM 节点很快

## Comparison with Previous Approaches

| 方案 | 依赖装饰 | 受光标影响 | 其他 block 干扰 |
|------|---------|----------|---------------|
| 基于 Mark class | 是 | 是 | 是 |
| 基于 DOM class | 部分 | 是 | 是 |
| **Modulo 直接检测** | 否 | **否** | **否** |