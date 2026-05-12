## Why

openspec/config.yaml 缺少项目上下文配置，导致 AI 在创建 artifacts 时无法充分理解项目技术栈、规范和领域知识，影响生成质量。同时缺少 per-artifact rules，无法对不同 artifacts 设置专门的约束规则。

## What Changes

- 为 openspec/config.yaml 添加完整的技术栈说明（TypeScript、React、Tailwind CSS 等）
- 添加项目编码规范和提交约定
- 添加 per-artifact rules，对 proposal、design、tasks、specs 设置专门的约束规则
- 添加 domain 描述，明确项目定位（笔记应用）

## Capabilities

### New Capabilities
- `openspec-config`: 扩展 openspec 配置，提供项目上下文和 per-artifact 规则配置能力

### Modified Capabilities
- (无)

## Impact

- openspec/config.yaml 配置增强
- AI 生成 artifacts 时能更好地理解项目约束
