## Why

代码块（``` ``` ```）在预览时被分割成多个单行块，而不是整个代码块在一个框内统一显示。

## What Changes

- **检查** FencedCode 节点结构，确保整个代码块被正确识别
- **修改** 装饰器逻辑，正确处理代码块内容不被分割

## Capabilities

### New Capabilities

- （无 - 修复现有功能）

### Modified Capabilities

- `syntax-tree-markdown-editor`：修复代码块预览分割问题

## Impact

- **代码**：`src/core/editor/core/plugins/markdownDecoration.ts`
- **影响**：代码块预览显示