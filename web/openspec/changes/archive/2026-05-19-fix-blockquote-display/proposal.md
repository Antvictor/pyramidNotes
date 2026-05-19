## Why

引用块（> quote）在预览时被分割成多个单行块。连续的 > 引用行应该合并在一个引用框内显示，而不是每行独立一个框。

## What Changes

- **检查** Lezer 对多行引用块的解析结构
- **修改** 装饰器逻辑，确保连续的 > 引用被合并处理

## Capabilities

### New Capabilities

- （无 - 修复现有功能）

### Modified Capabilities

- `syntax-tree-markdown-editor`：修复引用块预览分割问题

## Impact

- **代码**：`src/core/editor/core/plugins/markdownDecoration.ts`
- **影响**：引用块预览显示