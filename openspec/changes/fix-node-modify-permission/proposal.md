## Why

修改节点名称时提示"没有系统权限"，但新增节点和保存笔记都正常工作。需要调查修改节点时的权限问题。

## What Changes

- 调查 `editNode` 函数中文件写入/元数据更新时的权限校验逻辑
- 修复修改节点时的权限问题

## Capabilities

### New Capabilities
- `node-modify-permission`: 修复修改节点名称时的权限校验问题

### Modified Capabilities
- 无

## Impact

- 涉及 `MindMap.jsx` 中的 `editNode` 函数
- 涉及文件元数据写入逻辑