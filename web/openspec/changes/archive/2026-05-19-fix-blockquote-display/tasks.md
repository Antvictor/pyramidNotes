## 1. 检查 Blockquote 节点结构

- [x] 1.1 验证 Lezer Blockquote 节点结构
- [x] 1.2 检查当前装饰器对 Blockquote 的处理逻辑

## 2. 修复引用块显示

- [x] 2.1 修正装饰器，确保 Blockquote 作为整体处理（添加 `{ skip: true }` 跳过子节点）
- [x] 2.2 确保 CSS `.md-blockquote-content` 正确合并内容

## 3. 验证

- [x] 3.1 构建并验证引用块预览正常显示