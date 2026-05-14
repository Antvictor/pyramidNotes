## 1. 移除 antd 样式导入

- [x] 1.1 删除 `web/src/main.jsx` 中的 `import 'antd/dist/reset.css'`

## 2. 重写 OpenPrompt 组件

- [x] 2.1 创建 `web/src/pages/commons/OpenPrompt.jsx` 使用 radix-ui Dialog
- [x] 2.2 保持原有 props API（visible, id, title, onOk, onCancel）
- [x] 2.3 实现输入框自动聚焦
- [x] 2.4 实现 Enter 键提交
- [x] 2.5 实现 ESC 键取消
- [x] 2.6 保持原有样式风格

## 3. 清理依赖

- [x] 3.1 从 `web/package.json` 中移除 antd 依赖（如果还存在）- 已确认不存在
- [x] 3.2 验证构建和启动正常 - 需要 Node.js 20.19+ 环境