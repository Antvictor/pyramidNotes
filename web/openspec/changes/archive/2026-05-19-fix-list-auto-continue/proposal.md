## Why

在 Markdown 编辑器中输入列表项后按回车，当前不会自动继续生成下一个列表项标记。需要实现回车自动继续列表（回车两次取消）功能。

## What Changes

- **修改** `autoList.ts` 插件，扩展正则以支持 `1)` 格式
- **新增** 回车两次取消列表功能（检测空行或非列表行）

## Capabilities

### New Capabilities

- `list-auto-continue`：列表项回车自动继续，回车两次取消

### Modified Capabilities

- （无）

## Impact

- **代码**：`src/core/editor/core/plugins/autoList.ts`
- **影响**：列表编辑体验