## Why

代码块预览目前仍然是一行一个框（上边框紧挨着 ```），看起来像多行而不是一个整体。期望效果是整个代码块在一个框内，上下边框分别紧挨着开始和结束的 ```。

## What Changes

- **修改** CSS `.md-code-block-content` 样式
- **确保** 代码块作为连续的整体显示，边框紧邻围栏标记

## Capabilities

### Modified Capabilities

- `syntax-tree-markdown-editor`：修复代码块预览显示效果

## Impact

- **代码**：`src/core/editor/css/markdown.css`