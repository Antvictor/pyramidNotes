## Why

项目中仍引用 antd 依赖，但 antd 包已从 node_modules 中删除，导致启动报错：

```
Failed to resolve import "antd/dist/reset.css" from "src/main.jsx"
```

当前项目已使用 radix-ui（通过 shadcn）和 lucide-react 图标库，可以完全替代 antd 的功能，无需重新引入 antd 依赖。

## What Changes

1. **移除 antd 样式导入**：删除 `main.jsx` 中的 `import 'antd/dist/reset.css'`
2. **替换 OpenPrompt 组件**：用 radix-ui Dialog 组件重写，移除 antd 的 Modal 和 Input
3. **清理依赖**：从 package.json 中移除 antd 依赖

## Capabilities

### New Capabilities

- `open-prompt-replacement`: 使用 radix-ui Dialog 重写 OpenPrompt 组件，提供相同功能（输入节点名称的对话框）

### Modified Capabilities

- 无

## Impact

- `web/src/main.jsx` - 移除 antd 样式导入
- `web/src/pages/commons/OpenPrompt.jsx` - 重写为使用 radix-ui Dialog
- `web/package.json` - 移除 antd 依赖（已丢失但未清理）