## Why

当前 Markdown 编辑器的样式存在以下问题：
1. 所有 CSS 集中在一个 `markdown.css` 文件中，难以维护和测试
2. 各语法元素（标题、列表、代码块、引用等）的样式与解析逻辑分散在不同目录
3. CSS 变量与具体样式值混杂，变量覆盖和冲突难以追踪
4. 测试时无法单独隔离和验证单个语法元素的样式

## What Changes

- **重组** CSS 目录结构，每个语法元素（heading、list、code-block、blockquote、inline-code）拥有独立的 CSS 文件和变量文件
- **重构** 解析插件，每个语法元素的解析类放置在对应语法的目录内（如 `plugins/heading/markdownDecoration.ts`）
- **统一** 变量系统，所有变量通过引用/使用的方式汇集到主文件中
- **优化** 可测试性，单独 import 某个语法元素的 CSS 可验证其样式

## Capabilities

### New Capabilities

- `syntax-css-modularization`：CSS 模块化重构，每个语法元素有独立目录，包含自身的变量和样式

### Modified Capabilities

- `syntax-tree-markdown-editor`：实现方式改变，但最终效果不变

## Impact

- **代码**：
  - 旧：`src/core/editor/css/markdown.css`（单文件）
  - 新：
    - `src/core/editor/css/` 目录重组为：
      ```
      css/
      ├── variables.css          # 全局 CSS 变量
      ├── index.css              # 汇总引用所有模块
      ├── heading/
      │   ├── variables.css      # 标题相关变量
      │   └── styles.css         # 标题样式
      ├── list/
      │   ├── variables.css
      │   └── styles.css
      ├── code-block/
      │   ├── variables.css
      │   └── styles.css
      ├── blockquote/
      │   ├── variables.css
      │   └── styles.css
      └── inline-code/
          ├── variables.css
          └── styles.css
      ```
    - `src/core/editor/core/plugins/` 目录重组为：
      ```
      plugins/
      ├── autoContinue.ts
      ├── markdownDecoration.ts
      ├── cursorSyntax.ts
      ├── paste.ts
      ├── heading/
      │   └── index.ts            # 标题解析逻辑
      ├── list/
      │   └── index.ts            # 列表解析逻辑
      ├── code-block/
      │   └── index.ts           # 代码块解析逻辑
      ├── blockquote/
      │   └── index.ts           # 引用块解析逻辑
      └── inline-code/
          └── index.ts           # 行内代码解析逻辑
      ```
- **测试**：可通过单独引入某个模块的 CSS 验证样式，无需加载全部样式