## Context

当前 Markdown 编辑器的 CSS 和解析逻辑存在以下问题：
- `markdown.css` 是一个 8000+ 行的单文件，混合了所有语法元素的样式
- 解析逻辑（markdownDecoration.ts）采用 switch-case 处理所有语法节点
- CSS 变量没有统一管理，散落在文件中
- 测试时无法单独隔离某个语法元素的样式

现状目录结构：
```
src/core/editor/
├── css/
│   └── markdown.css          # 8000+ 行单文件
└── core/plugins/
    ├── markdownDecoration.ts  # 150+ 行 switch-case
    ├── autoContinue.ts
    ├── autoList.ts
    ├── autoBlockquote.ts
    └── ...
```

## Goals / Non-Goals

**Goals:**
- 每个语法元素（heading、list、code-block、blockquote、inline-code）有独立目录
- 每个语法元素目录包含自己的 CSS 变量文件和样式文件
- 解析逻辑按语法元素拆分，不再是巨型 switch-case
- 通过 CSS 变量引用关系确保可追溯性
- 可单独 import 某个模块的 CSS 进行测试

**Non-Goals:**
- 不改变最终的渲染效果
- 不改变现有的 API 接口
- 不引入新的 CSS 预处理器（保持原生 CSS）

## Decisions

### Decision 1: CSS 目录结构

**选择**：按语法元素分区，每个元素有自己的 variables.css 和 styles.css

**理由**：
- 高内聚：相关变量和样式放在一起
- 可测试：可以单独引入某个模块验证样式
- 可维护：修改某个元素样式时只需关注对应目录

### Decision 2: 解析逻辑组织

**选择**：每个语法元素的装饰逻辑放在自己目录下的 index.ts

**理由**：
- 遵循高内聚原则，解析逻辑与对应 CSS 目录一致
- 便于定位和修改特定语法元素的解析行为

### Decision 3: 变量汇总方式

**选择**：主文件通过 `@import` 或直接引用变量使用，变量定义在各模块的 variables.css

**理由**：
- 保持变量的定义与使用在语义上一致
- 通过 CSS 层叠和继承关系，变量覆盖和冲突变得可追踪

## New Directory Structure

```
src/core/editor/
├── css/
│   ├── index.css              # 汇总所有模块
│   ├── variables.css          # 全局变量（颜色、字体等基础变量）
│   ├── heading/
│   │   ├── variables.css      # 标题专用变量（字体大小、颜色等）
│   │   └── styles.css         # 标题样式（使用变量）
│   ├── list/
│   │   ├── variables.css
│   │   └── styles.css
│   ├── code-block/
│   │   ├── variables.css
│   │   └── styles.css
│   ├── blockquote/
│   │   ├── variables.css
│   │   └── styles.css
│   └── inline-code/
│       ├── variables.css
│       └── styles.css
└── core/plugins/
    ├── index.ts                # 统一导出
    ├── markdownDecoration.ts   # 主入口，协调各模块
    ├── autoContinue.ts
    ├── autoList.ts
    ├── autoBlockquote.ts
    ├── cursorSyntax.ts
    ├── paste.ts
    ├── heading/
    │   └── index.ts            # 标题装饰逻辑
    ├── list/
    │   └── index.ts            # 列表装饰逻辑
    ├── code-block/
    │   └── index.ts           # 代码块装饰逻辑
    ├── blockquote/
    │   └── index.ts           # 引用块装饰逻辑
    └── inline-code/
        └── index.ts           # 行内代码装饰逻辑
```

## Risks / Trade-offs

1. **迁移成本** → 通过逐步迁移实现，先建立目录结构，再迁移代码
2. **变量覆盖顺序** → 需要明确各 variables.css 的加载顺序，确保基础变量先加载
3. **构建产物大小** → 使用 CSS 的 tree-shaking 或按需加载避免最终包体积增大

## Migration Plan

1. 创建新目录结构（heading、list、code-block、blockquote、inline-code）
2. 迁移 `markdown.css` 中的变量到各模块的 variables.css
3. 迁移样式到各模块的 styles.css
4. 迁移 markdownDecoration.ts 中的处理逻辑到各模块的 index.ts
5. 创建 index.css 汇总所有模块
6. 删除旧文件
7. 测试验证渲染效果一致