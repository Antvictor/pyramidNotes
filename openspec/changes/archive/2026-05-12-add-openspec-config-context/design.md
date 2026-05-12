## Context

openspec/config.yaml 目前为空配置，AI 在生成 artifacts 时缺少项目背景信息，如技术栈、编码规范等。同时缺少 per-artifact 规则，无法针对不同 artifact 类型设置专门的约束。

## Goals / Non-Goals

**Goals:**
- 补充 config.yaml 的 context 配置，包含项目技术栈和领域描述
- 添加 per-artifact rules，对不同 artifact 设置专门约束

**Non-Goals:**
- 不涉及 openspec 工作流的修改
- 不修改现有 artifact 模板

## Decisions

1. **Context 配置内容**
   - 技术栈：TypeScript、React、Tailwind CSS、Electron、pnpm workspace
   - 项目结构：web/ (前端)、electron/ (桌面端)、openspec/ (变更管理)
   - 提交规范：conventional commits
   - Domain：笔记应用 (pyramidNotes)

2. **Per-artifact Rules**
   - proposal：保持简洁，500 字以内，包含 Non-goals
   - design：包含 Goals/Non-Goals、Risks、Open Questions
   - tasks：任务拆解粒度控制在 2 小时内
   - specs：使用 4 层级标题 (####)，使用 SHALL/MUST 关键词

3. **格式采用 YAML 多行字符串**
   - 使用 | 符号保留格式
   - 每行不超过 80 字符

## Risks / Trade-offs

- [风险] 配置过详细可能导致 AI 过于受限 → 保持 context 简洁，只提供关键信息
- [风险] rules 约束过多可能导致灵活性下降 → rules 仅作为建议性约束
