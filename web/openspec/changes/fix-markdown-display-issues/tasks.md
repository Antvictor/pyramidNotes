## 1. 修复代码块整体边框

- [x] 1.1 调整 CSS `.md-code-block-content` 确保多行在一个边框内
- [x] 1.2 验证多行代码块显示正常

## 2. 减少列表序号间隔

- [x] 2.1 调整 CSS `.md-list-item-content` 的 padding/margin
- [x] 2.2 使用 `::before` 的 `margin-right` 控制间隔
- [x] 2.3 验证序号与文字间隔约 1-2 空格

## 3. 实现引用块回车自动继续

- [x] 3.1 扩展 autoContinue 支持引用块 `> ` 标记
- [x] 3.2 空引用行 `> ` 按回车删除 `>` 并结束引用
- [x] 3.3 验证引用块回车继续正常

## 4. 重构 autoContinue 架构

- [x] 4.1 创建 autoContinue.ts 基础框架
- [x] 4.2 创建 autoList.ts list策略
- [x] 4.3 创建 autoBlockquote.ts 引用策略
- [x] 4.4 更新 createEditor.ts 使用新架构

## 5. 验证

- [x] 5.1 构建并验证所有修复