# syntax-css-modularization Specification

## ADDED Requirements

### Requirement: CSS Module Directory Structure

每个 Markdown 语法元素 SHALL 拥有独立的目录结构，包含 variables.css 和 styles.css。

#### Scenario: Directory structure exists
- **WHEN** CSS 模块化完成
- **THEN** `src/core/editor/css/` 下存在 heading、list、code-block、blockquote、inline-code 目录
- **AND** 每个目录包含 variables.css 和 styles.css

### Requirement: Variables Located with Usage

CSS 变量 SHALL 定义在其对应语法元素的 variables.css 中，而不是集中在单一文件。

#### Scenario: Variable location matches usage
- **WHEN** 开发者需要修改标题相关变量
- **THEN** 变量定义在 `css/heading/variables.css`
- **WHEN** 开发者需要修改列表相关变量
- **THEN** 变量定义在 `css/list/variables.css`

### Requirement: Index Imports All Modules

主入口 index.css SHALL 汇总引用所有语法模块的样式。

#### Scenario: All modules loaded
- **WHEN** 页面加载 Markdown 编辑器
- **THEN** 所有语法元素的样式（标题、列表、代码块、引用、行内代码）都被加载

### Requirement: Plugin Structure Mirrors CSS

解析插件目录结构 SHALL 与 CSS 模块结构保持一致。

#### Scenario: Plugin directory matches CSS
- **WHEN** 查找标题解析逻辑
- **THEN** 在 `core/plugins/heading/index.ts` 找到
- **WHEN** 查找列表解析逻辑
- **THEN** 在 `core/plugins/list/index.ts` 找到

### Requirement: Isolated Module Testing

每个语法元素的 CSS SHALL 可以独立引入和测试。

#### Scenario: Single module can be tested
- **WHEN** 开发者只引入 `css/heading/styles.css`
- **THEN** 标题样式可以独立验证，不依赖其他模块