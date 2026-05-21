## Context

**当前状态**：
- 编辑器基于 CodeMirror 6 + @lezer/markdown
- 使用 ViewPlugin + Decoration 系统进行 Markdown 语法装饰
- `markdownDecoration.ts` 负责处理标题、引用、列表、代码块等元素的样式
- `codeBlockWrapper.ts` 负责代码块围栏的检测和样式应用

**迁移原因**：
1. CodeMirror 6 的 Decoration 系统无法实现真正的块级渲染（如 `<blockquote>` 而非 `<span class="md-blockquote">`）
2. 代码块围栏检测依赖 DOM 渲染时机，存在竞态条件
3. 缺乏所见即所得的实时预览能力

## Goals / Non-Goals

**Goals:**
- 实现真正的 WYSIWYG Markdown 编辑体验（类似 Typora）
- 在编辑器内直接渲染标题、引用、列表、代码块等元素
- 支持代码块语法高亮
- 保持 Vue 框架集成

**Non-Goals:**
- 不实现协同编辑（collaboration）功能
- 不实现复杂的数学公式渲染（可以后续扩展）
- 不保留 CodeMirror 6 的 API 兼容性

## Decisions

### Decision 1: 选择 Milkdown 而非继续改进 CodeMirror 6

**选择**：迁移到 Milkdown (ProseMirror + remark)

**理由**：
- Milkdown 提供开箱即用的 WYSIWYG 实时预览
- 插件驱动架构，扩展性好
- 官方 Vue 集成支持 (@milkdown/vue)
- 活跃维护（2024-2025 持续更新）

**替代方案**：
- HyperMD：基于 CodeMirror 5，已不维护，迁移 = 重写
- 自己实现：工作量巨大，需要重建 fold 系统和 inline preview

### Decision 2: 使用 @milkdown/react 集成包

**选择**：使用官方 `@milkdown/react` 包

**理由**：
- 官方维护，类型支持完整
- 提供 `useEditor` hook
- 与 React 18 配合良好

### Decision 3: 插件选择

**选择**：使用 `@milkdown/preset-commonmark` 作为基础 preset

**包含**：
- `schema`: Markdown 节点定义（heading, paragraph, blockquote, list, codeBlock 等）
- `inputRules`: 自动格式化规则（如 `-` → list item）
- `keymap`: 快捷键支持
- `commands`: 编辑命令

**额外插件**：
- `@milkdown/plugin-prism`: 代码块语法高亮

### Decision 4: 迁移策略

**选择**：渐进式迁移

1. 创建新的 `editor/milkdown/` 目录
2. 逐步实现：基础编辑器 → 代码块 → 列表/引用 → 自动续行
3. 保留现有 `editor/cm6/` 目录以便回滚
4. 最终切换入口点，移除 CodeMirror 6

## Migration Plan

```
Phase 1: 基础搭建
├── 安装依赖 @milkdown/core, @milkdown/vue, @milkdown/plugin-prism, @milkdown/preset-commonmark
├── 创建 milkdown 编辑器入口
└── 实现基础 Markdown 渲染

Phase 2: 功能迁移
├── 迁移代码块高亮 (prism plugin)
├── 迁移列表、引用块渲染
├── 迁移自动续行逻辑
└── 迁移快捷键绑定

Phase 3: 清理
├── 移除 CodeMirror 6 相关代码
├── 更新 CSS 样式适配
└── 测试所有编辑功能
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| ProseMirror API 学习成本高 | 预留时间研究 Milkdown 架构 |
| 迁移后功能缺失 | 保留旧编辑器代码，渐进迁移 |
| CSS 样式需要大幅调整 | Milkdown 使用 Nord theme，可以自定义 |
| 回滚成本高 | Git 分支管理，随时可以切换回 CM6 |

## Open Questions

1. Milkdown 的 Vue 集成是否满足当前项目需求？
2. 是否需要保留 CodeMirror 6 编辑器作为备选方案？
3. 现有的 markdownDecoration.ts 中的装饰逻辑在 Milkdown 中如何实现？
4. 自动续行逻辑（autoContinue）如何迁移到 ProseMirror 的 Plugin 系统？