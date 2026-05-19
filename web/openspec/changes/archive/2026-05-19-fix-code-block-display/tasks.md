## 1. 检查 FencedCode 节点结构

- [x] 1.1 验证 Lezer FencedCode 节点包含整个代码块
- [x] 1.2 检查当前装饰器对 FencedCode 的处理逻辑

## 2. 修复代码块显示

- [x] 2.1 修正装饰器，确保 FencedCode 作为整体处理（添加 `{ skip: true }` 跳过子节点）
- [x] 2.2 确保 CSS `.md-code-block-content` 正确包裹内容

## 3. 验证

- [x] 3.1 构建并验证代码块预览正常显示