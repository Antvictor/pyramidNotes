# math-mermaid-rendering Specification

## ADDED Requirements

### Requirement: 行内数学公式
编辑器中输入 `$latex$`(开 $ 前为行首/空白/标点,内容首尾无空白) SHALL 转换为 KaTeX 行内渲染节点;加载含 `$latex$` 的文档 SHALL 解析为同一节点;删除节点(Backspace/Delete)SHALL 还原 `$latex$` 源文本;双击节点 SHALL 进入源码编辑(Enter/blur 提交,Escape 取消)。

#### Scenario: 货币文本不转换
- **WHEN** 文本为 `$100 and $200` 或 `价格$5,共$8`
- **THEN** 保持纯文本,不创建数学节点

### Requirement: 块级数学公式
输入行尾 `$$` SHALL 创建空公式块并直接进入源码编辑;加载 `$$` 围栏(含多行)SHALL 解析为块级节点,序列化还原为 `$$\nlatex\n$$`;双击渲染层进入 textarea 编辑(Ctrl/Cmd+Enter 或 blur 提交,Escape 取消)。

### Requirement: math 代码块
```math 围栏 SHALL 保持 codeBlock 节点类型不变,但渲染为 KaTeX displayMode;双击进入原生源码编辑,Escape/点击外部回到渲染态。

### Requirement: mermaid 代码块
```mermaid 围栏 SHALL 渲染为 Mermaid SVG(懒加载、500ms 防抖);双击进入原生源码编辑;语法错误 SHALL 显示错误框且源码不丢失;文档主题切换 SHALL 重渲染对应主题。

### Requirement: 现有代码块零回归
language 非 mermaid/math 的代码块 SHALL 走原有默认渲染(lowlight 高亮),行为与样式不变。

### Requirement: 序列化往返
公式/图表内容经保存-加载 SHALL 保持语义不变(节点 ↔ markdown 文本往返)。
