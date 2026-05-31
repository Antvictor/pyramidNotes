# 新手教程（冒泡引导）实现计划

> **设计文档**: `docs/superpowers/specs/2026-05-31-tutorial-design.md`
> **状态**: 实现中

---

## 概述

基于设计文档，实现一个非侵入式的冒泡引导系统。

**新增文件**:
- `web/src/components/tutorial/TUTORIAL_STEPS.js` - 步骤定义
- `web/src/components/tutorial/SelectionRing.jsx` - 虚线选中框
- `web/src/components/tutorial/BubbleTooltip.jsx` - 气泡提示框
- `web/src/components/tutorial/AutoActionExecutor.js` - 自动执行器
- `web/src/components/tutorial/Detector.js` - 检测器
- `web/src/components/tutorial/TutorialController.jsx` - 顶层控制器

**修改文件**:
- `web/src/App.jsx` - 引入 TutorialController

---

## Task 1: 创建步骤定义文件

**文件**: Create `web/src/components/tutorial/TUTORIAL_STEPS.js`

- [ ] 创建文件
- [ ] 定义 APP_VERSION 常量
- [ ] 定义 11 个步骤的 TUTORIAL_STEPS 数组
- [ ] 每个步骤包含: id, page, target, autoAction, requiredAction, bubbleContent, bubbleAfterAction, buttons

---

## Task 2: 创建 SelectionRing 组件

**文件**: Create `web/src/components/tutorial/SelectionRing.jsx`

- [ ] 创建组件，接收 `target` 和 `stepId` props
- [ ] 实现 `useEffect` 根据 `target.type` 定位目标元素
- [ ] 支持的类型: 'pane', 'node', 'dialog', 'editor', 'sidebar-settings', 'change-dir-button', 'shortcuts-button', 'keyboard'
- [ ] 使用 `getBoundingClientRect()` 获取位置
- [ ] 渲染虚线边框动画 div
- [ ] 添加 pulse 动画样式
- [ ] 处理未找到元素的情况

---

## Task 3: 创建 BubbleTooltip 组件

**文件**: Create `web/src/components/tutorial/BubbleTooltip.jsx`

- [ ] 创建组件，接收 `step`, `phase`, `onNext`, `onSkip` props
- [ ] 根据 phase 切换显示 `bubbleContent` 或 `bubbleAfterAction`
- [ ] 根据 `step.buttons` 渲染按钮 (skip, next)
- [ ] Button 使用已有的 `@/components/ui/button`
- [ ] 居中定位，添加 fadeIn 动画
- [ ] 设置 z-index 为 9999

---

## Task 4: 创建自动执行器

**文件**: Create `web/src/components/tutorial/AutoActionExecutor.js`

- [ ] 创建 `executeAutoAction(autoAction)` 异步函数
- [ ] 实现 `contextmenu` 动作: 在目标元素上触发 contextmenu 事件
- [ ] 实现 `navigate` 动作: 导航到指定路径
- [ ] 实现 `open-directory-dialog` 动作: 调用 window.api.selectDirectory()
- [ ] 实现 `click-button` 动作: 点击指定按钮
- [ ] 实现 `dialog-opened` 动作: 检测弹窗是否打开

---

## Task 5: 创建检测器

**文件**: Create `web/src/components/tutorial/Detector.js`

- [ ] 创建 `Detector` 对象
- [ ] 实现 `watchNotesData(callback)`: 监听 notesData 变化
- [ ] 实现 `watchRoute(callback)`: 监听路由变化
- [ ] 实现 `watchSettings(callback)`: 监听设置变化
- [ ] 实现 `watchDialogOpened(dialogType, callback)`: 监听 DOM 弹窗
- [ ] 实现 `createListener(eventType, callback)`: 根据事件类型创建监听器
- [ ] 支持的事件: 'requestCreateNode', 'requestEditNode', 'requestDeleteNode', 'navigateToNote', 'navigateToMindMap', 'directoryChanged', 'shortcutsModalOpened'

---

## Task 6: 创建 TutorialController 组件

**文件**: Create `web/src/components/tutorial/TutorialController.jsx`

- [ ] 创建组件，接收 `children`
- [ ] 实现状态: `isActive`, `currentStepIndex`, `phase`
- [ ] 实现 `initTutorial()`: 初始化时检查版本，判断是否开始教程
- [ ] 实现 `handleNext()`: 点击"下一步"的处理逻辑
- [ ] 实现 `handleSkip()`: 点击"跳过"的处理逻辑
- [ ] 实现 `handleUserActionCompleted(eventType)`: 检测用户操作完成
- [ ] 实现 `advanceToNextStep()`: 进入下一步
- [ ] 实现 `completeTutorial()`: 保存 tutorialVersion 到 settings
- [ ] 实现 `executeAutoAction()`: 执行自动动作
- [ ] 渲染 SelectionRing 和 BubbleTooltip
- [ ] 注册 `window.tutorial` 接口

---

## Task 7: 集成到 App.jsx

**文件**: Modify `web/src/App.jsx`

- [ ] 导入 TutorialController
- [ ] 在 AppContent 组件中用 TutorialController 包裹 children
- [ ] 确保 TutorialController 在最上层

---

## Task 8: 添加样式文件

**文件**: Create `web/src/components/tutorial/tutorial.css`

- [ ] 添加 `.selection-ring` 的 pulse 动画
- [ ] 添加 `.bubble-tooltip` 的 fadeIn 动画
- [ ] 导入到 TutorialController.jsx

---

## Task 9: 验证开发服务器运行

- [ ] 运行 `curl -s http://localhost:5173 > /dev/null && echo "Server OK" || echo "Server not running"`
- [ ] 预期: Server OK

---

## Task 10: 提交代码

- [ ] git add 新增和修改的文件
- [ ] git commit -m "feat: add tutorial system with bubble guide"

---

## 验证清单

- [ ] 首次打开应用，教程自动弹出 Step 1
- [ ] 点「下一步」，自动打开右键菜单
- [ ] 点「创建节点」，自动进入 Step 2
- [ ] 完成所有步骤，`tutorialVersion` 被正确保存
- [ ] 点「跳过」，教程关闭，`tutorialVersion` 被保存
- [ ] 关闭应用重新打开，教程不再弹出