## Context

当前代码块包装使用 `querySelectorAll('.cm-line')` 遍历所有行，并根据文本内容中的 ` ``` ` 数量决定是否添加 `in-code-block` class。

**问题复现**：
```
1. 1
2. 2
```
(this is a list)
```
(code block starts here)
2
```
(end here)

光标在 `1. 1` 或 `2. 2` 行时，代码块的 fence 标记失去 `in-code-block` class。
```

**根本原因分析**：

问题可能出在：
1. CodeMirror 在光标移动时重新渲染 DOM，`.cm-line` 的顺序可能改变
2. 有序列表的 `.cm-line` 可能有特殊的子结构，导致 `textContent` 检测不准确
3. `wrapCodeBlocks` 在 `selectionSet` 时被调用，但处理逻辑可能有问题

## Goals / Non-Goals

**Goals:**
- 修复代码块边界检测在有序列表行存在时失效的问题
- 确保 `in-code-block` class 在所有光标位置下都正确应用
- 边界检测完全基于文档文本，不受光标位置或 DOM 结构影响

**Non-Goals:**
- 不修改有序列表的渲染逻辑
- 不改变代码块边界检测的核心算法（modulo 计数）

## Decisions

### Decision 1: 使用文档位置而非 DOM 查询

**选择**：遍历 `view.state.doc` 获取行信息，而不是查询 DOM

**理由**：
- CodeMirror 的 DOM 可能在光标移动时重新排序
- `view.state.doc` 是 source of truth，不受 DOM 渲染影响
- 通过 `doc.lineAt()` 和行索引可以精确定位

**实现**：
```typescript
function wrapCodeBlocks(view: EditorView): void {
    const doc = view.state.doc;
    const dom = view.dom;

    // 清理旧 class
    unwrapCodeBlocks(view);

    // 获取当前文档的所有行文本
    for (let i = 1; i <= doc.lines; i++) {
        const line = doc.line(i);
        const text = line.text;
        const fenceCount = countFences(text);

        if (fenceCount > 0) {
            // 找到 fence，标记当前和后续相关行
        }
    }

    // 应用 class 到对应的 DOM 元素
    const cmLines = dom.querySelectorAll('.cm-line');
    // 根据行索引应用 class
}
```

### Decision 2: 在标记时记录完整的代码块范围

**选择**：先遍历完整文档，记录所有代码块的范围（startLine, endLine），然后一次性应用 class

**理由**：
- 避免在遍历过程中修改 DOM 导致状态不一致
- 两遍扫描：第一遍记录范围，第二遍应用 class
- 即使中间有 DOM 变化，范围信息不会受影响

### Decision 3: 使用行号而非 DOM 引用

**选择**：通过行号计算代码块范围，然后根据行号匹配 DOM 元素

**理由**：
- 行号是稳定的，DOM 元素可能变化
- 可以先计算好所有范围，再批量应用
- 更容易调试和验证

## Risks / Trade-offs

1. **性能风险** → 两遍扫描可能略慢
   - **缓解**：现代设备上文档扫描很快，即使是几千行的文档

2. **行号匹配风险** → 如果 CodeMirror 内部行号与 DOM querySelector 顺序不一致
   - **缓解**：使用 `cmLines[index]` 直接索引（index 从 0 开始，行号从 1 开始）

3. **边界情况** → 空代码块（只有 ``` ``` ）
   - **缓解**：正确处理 start === end 的情况

## Migration Plan

1. 修改 `codeBlockWrapper.ts` 中的 `wrapCodeBlocks` 函数
2. 使用 `view.state.doc.lines` 获取总行数
3. 使用两遍扫描：计算范围 → 应用 class
4. 测试有序列表 + 代码块的混合场景