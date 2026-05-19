## Why

当前只有第一行有 `>` 的多行文本才被视为引用块，后续没有 `>` 的行不会被包含在引用块内。期望行为是多行 `>` 引用（每行都有 `>`）才算一个引用区间。

## What Changes

- **修改** 装饰器逻辑，确保只有连续的多行 `>` 引用被合并

## Capabilities

### Modified Capabilities

- `syntax-tree-markdown-editor`：修复引用块多行合并逻辑

## Impact

- **代码**：`src/core/editor/core/plugins/markdownDecoration.ts`