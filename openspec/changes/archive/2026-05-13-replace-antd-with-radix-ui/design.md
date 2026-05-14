## Context

项目中只有两处 antd 使用：
1. `main.jsx` 的 `import 'antd/dist/reset.css'` - 样式导入
2. `OpenPrompt.jsx` 中的 `Modal` 和 `Input` 组件

OpenPrompt 组件功能很简单：
- 显示一个模态对话框
- 用户输入节点名称
- 按确定或 Enter 提交
- 点击取消关闭

项目已有：
- radix-ui Dialog 组件（`web/src/components/ui/dialog.tsx`）
- lucide-react 图标
- 自定义 Input 组件（可通过 Button 样式扩展）

## Goals / Non-Goals

**Goals:**
- 移除 antd 相关代码，使用现有组件替代
- 保持 OpenPrompt 原有功能不变（输入节点名称的对话框）
- 提升 UI 一致性（统一使用 radix-ui 组件）

**Non-Goals:**
- 不引入新的 UI 依赖
- 不修改 OpenPrompt 的 API（props: visible, id, title, onOk, onCancel）
- 不修改样式变量（继续使用 CSS 变量）

## Decisions

### Decision 1: OpenPrompt 重写方案

**选择**：使用 radix-ui Dialog + 原生 input/button 重写 OpenPrompt。

**原因**：
- Dialog 组件已存在于 `web/src/components/ui/dialog.tsx`
- 功能简单，无需引入新的复杂组件
- 减少依赖，提升性能

**实现思路**：
```jsx
<Dialog open={visible} onOpenChange={...}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>请输入节点名称</DialogTitle>
    </DialogHeader>
    <input value={value} onChange={...} onKeyDown={...} />
    <DialogFooter>
      <Button onClick={onCancel}>取消</Button>
      <Button onClick={() => onOk(id, value)}>确定</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Decision 2: 样式保持

**选择**：保持现有 CSS 变量风格，Dialog 使用已有样式。

**原因**：避免大范围样式调整，风险低。

## Risks / Trade-offs

[Risk] Dialog 样式与原 Modal 略有差异 → [Mitigation] 通过 CSS 微调 DialogContent 样式

[Risk] 原生 input 样式与项目不一致 → [Mitigation] 使用已有的 input 样式类或简单内联样式