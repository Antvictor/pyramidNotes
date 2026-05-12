## Context

项目缺少一个集中化的能力总览文档。openspec/specs/ 目录目前为空，项目的能力信息分散在各个 change 的 proposal 和 spec 文件中，没有一个统一的入口来了解项目的全部能力。

## Goals / Non-Goals

**Goals:**
- 创建 openspec/capabilities.md 作为项目能力总览入口
- 定义清晰的 capability 格式，方便后续扩展
- 列出已实现和规划中的能力

**Non-Goals:**
- 不列出每个 capability 的详细规格（详细规格在各自 spec 文件中）
- 不替代 openspec 的 change 跟踪机制

## Decisions

1. **文件位置**
   - 位于 openspec/capabilities.md
   - 作为 openspec 根目录的固定文件

2. **Capability 格式**
   - 使用表格形式展示能力总览
   - 每行包含：能力名称、类型（已实现/规划中）、描述、相关 change 链接
   - 按实现状态分组（已实现 > 规划中）

3. **与 change 的关系**
   - 已在 implement-dark-mode 中实现的 capability 在表格中标记为"已实现"
   - 未来新 capability 通过 /opsx:propose 创建 change 时同步更新

## Risks / Trade-offs

- [风险] 需要维护同步更新 → 约定每次完成 change 时同步更新 capabilities.md
- [风险] 与 openspec list 功能重复 → capabilities.md 作为人工可读的概览，openspec list 作为 CLI 工具互补
