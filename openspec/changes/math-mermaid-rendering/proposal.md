# 编辑器数学公式与 Mermaid 图渲染

## Why

编辑器目前不支持数学公式与图表:`$...$`/`$$...$$` 显示为原始文本,```mermaid/```math 代码块只显示源码高亮。

## What Changes

- 数学公式:`$行内$` 与 `$$块级$$` 转换为 KaTeX 渲染节点(输入 InputRule + 加载 markdown-it 规则,无文本扫描)
- ```math 代码块渲染为 KaTeX;```mermaid 代码块渲染为 Mermaid 图
- 渲染态双击进入源码编辑(代码块走原生 contentDOM;公式节点走受控输入)
- 货币安全:开 `$` 前为字母/数字/CJK 时不转换
- Mermaid 懒加载、深色主题跟随、语法错误不丢源码

## Capabilities

### Added Capabilities

- `math-mermaid-rendering`:编辑器内数学公式与 Mermaid 图的书写、渲染、编辑与序列化行为
