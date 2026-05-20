## Context

**问题描述**：
用户报告"只要光标经过某些块（代码块、无序列表块、有序列表块、引用块）都会导致这些块后面 `%2=1` 的 ``` 样式消失"。

**当前代码逻辑**：
```typescript
// codeBlockWrapper.ts - wrapCodeBlocks
for (let lineNum = 1; lineNum <= doc.lines; lineNum++) {
    const line = doc.line(lineNum);
    const fenceCountInLine = countFences(line.text);

    if (fenceCountInLine > 0) {
        fenceCount += fenceCountInLine;

        if (fenceCount % 2 === 1) {
            // Odd: start code block
            codeBlockStartLine = lineNum;
        } else {
            // Even: end code block
            if (codeBlockStartLine !== -1) {
                ranges.push({ start: codeBlockStartLine, end: lineNum });
            }
            fenceCount = 0;  // <-- 重置！
            codeBlockStartLine = -1;
        }
    }
}
```

**关键发现**：每次遇到偶数 fence 时，`fenceCount` 被重置为 0。这意味着如果有多个代码块：

```
Line 1: ```
Line 2: code1
Line 3: ```
Line 4: list item  (这不算 fence，但可能有其他问题)
Line 5: ```        <-- fenceCount 应该是 3 (%2=1)，应该是上边界
```

但如果第 4 行有什么干扰导致 fenceCount 被重置...

**更可能的问题**：
`markdownDecoration.ts` 的 `build()` 函数在光标所在行会跳过装饰（`if (cursor >= from && cursor <= to) return;`）。如果代码块的 fence 行恰好是光标所在行，装饰会被跳过。但这不应该影响 `wrapCodeBlocks`，因为 `wrapCodeBlocks` 只依赖 `view.state.doc` 的文本内容。

**另一个可能**：
CodeMirror 的 DOM 更新有延迟。当 `update()` 被调用时，DOM 可能还没有完成重新渲染，导致 `querySelectorAll('.cm-line')` 返回的结果不准确。

## Goals / Non-Goals

**Goals:**
- 修复代码块检测在各种块类型后失效的问题
- 确保 `in-code-block` class 在任何光标位置下都正确应用
- 添加诊断日志以便追踪问题

**Non-Goals:**
- 不修改其他块的渲染逻辑
- 不改变代码块边界检测的核心 modulo 算法

## Decisions

### Decision 1: 使用更稳定的行匹配方式

**选择**：在应用 class 时，直接通过行号找到对应的 DOM line，而不是依赖 querySelectorAll 的顺序

**理由**：
- `querySelectorAll('.cm-line')` 返回的是 DOM 顺序，可能与 doc 行号不一致
- 应该使用 `view.lineAt` 或类似方法按行号精确查找

**实现**：
```typescript
// 不要用 querySelectorAll('.cm-line')
// 改用遍历 DOM 时检查是否是第 N 行
```

### Decision 2: 添加调试日志

**选择**：在关键位置添加 console.log，以便追踪 fenceCount 的变化

**理由**：
- 问题难以复现，需要日志来诊断
- 临时调试代码，完成后可以移除或设为可选

### Decision 3: 检查 DOM 同步问题

**选择**：在 wrapCodeBlocks 中添加对 DOM 和 doc 行数一致性的检查

**理由**：
- 如果 `doc.lines !== cmLines.length`，说明有同步问题
- 需要先解决同步问题才能正确应用 class

## Migration Plan

1. 添加调试日志
2. 验证 DOM 和 doc 行数是否一致
3. 如果一致，修复行匹配逻辑
4. 如果不一致，调查为什么

## Open Questions

1. CodeMirror 在什么情况下 DOM line 数会与 doc line 数不一致？
2. `querySelectorAll('.cm-line')` 的返回顺序是否总是与 doc 行号对应？