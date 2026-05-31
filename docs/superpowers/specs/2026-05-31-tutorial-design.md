# 新手教程（冒泡引导）设计文档

> **版本**: 1.0.0
> **状态**: 设计中
> **最后更新**: 2026-05-31

---

## 1. 概述

### 1.1 目标

实现一个非侵入式的冒泡引导系统，用于在用户首次打开应用时展示功能使用说明。

### 1.2 核心特性

- **冒泡形式**: 带选择框的tooltip，指向目标元素
- **自动 + 强制**: 部分步骤自动触发，部分步骤强制用户操作
- **版本控制**: 基于首次打开版本号判断是否展示
- **非侵入**: 不修改现有业务逻辑，通过监听/触发现有接口实现

### 1.3 术语定义

| 术语 | 说明 |
|------|------|
| Selection Ring | 选中目标元素的虚线边框动画 |
| Bubble | 气泡提示框，包含说明文字和按钮 |
| TutorialController | 教程顶层控制器 |
| Step | 教程中的一个步骤 |
| Auto Phase | 点"下一步"后自动触发的阶段 |
| User Action Phase | 强制用户操作的阶段 |

---

## 2. 整体流程

### 2.1 教程流程图

```
用户首次打开应用
       │
       ▼
┌─────────────────┐
│ 加载 tutorialVersion │
│ 从 settings.json  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────┐
│ tutorialVersion < APP_VERSION 或 不存在？        │
└────────┬────────────────────────────────────────┘
         │
    ┌────┴────┐
    │  是    │   否
    ▼        ▼   ▼
┌────────┐  结束
│ 开始教程 │
└────────┘
```

### 2.2 教程步骤列表

| Step | ID | 页面 | 说明 |
|------|-----|------|------|
| 1 | `create-node` | MindMap | 创建节点：右键空白区域 |
| 2 | `create-node-confirm` | MindMap | 创建节点：输入名称 |
| 3 | `edit-node` | MindMap | 修改节点：右键已有节点 |
| 4 | `edit-node-confirm` | MindMap | 修改节点：输入新名称 |
| 5 | `open-note` | MindMap | 双击节点进入笔记 |
| 6 | `edit-note` | Note | 输入笔记内容 |
| 7 | `back-to-map` | Note | 按 Escape 返回 |
| 8 | `delete-node` | MindMap | 删除节点：右键已有节点 |
| 9 | `go-settings` | MindMap→Settings | 导航到设置页面 |
| 10 | `change-directory` | Settings | 修改存储目录 |
| 11 | `open-shortcuts` | Settings | 打开快捷键配置 |
| 12 | `complete` | - | 教程完成 |

---

## 3. 数据结构

### 3.1 settings.json 新增字段

```javascript
{
  // 现有字段...
  "tutorialVersion": "1.0.0"  // 用户完成教程时记录的版本号
}
```

**判断逻辑**:
- `tutorialVersion` 不存在 → 首次使用，展示所有步骤
- `tutorialVersion` < 当前 `APP_VERSION` → 展示新增功能的步骤（预留，后续版本可能新增）
- `tutorialVersion` == `APP_VERSION` → 不展示教程

### 3.2 TutorialController 状态

```javascript
// TutorialController 内部状态
{
  isActive: boolean,           // 教程是否激活
  currentStepIndex: number,    // 当前步骤索引
  phase: 'idle' | 'auto' | 'user-action',  // 当前阶段
  completedSteps: Set<string>, // 已完成的步骤ID（用于skip检测）
}
```

### 3.3 步骤定义

```javascript
const TUTORIAL_STEPS = [
  // ========== Step 1: 创建节点 ==========
  {
    id: 'create-node',
    page: 'MindMap',
    target: { type: 'pane' },  // 目标：画布空白区域
    autoAction: {
      type: 'contextmenu',
      description: '自动触发右键菜单'
    },
    requiredAction: {
      type: 'click-menu-item',
      menuItem: 'create',
      detectEvent: 'requestCreateNode'
    },
    bubbleContent: '右键空白区域可以创建新节点，自动归入根节点',
    bubbleAfterAction: '请点击菜单中的「创建节点」',
    buttons: ['skip', 'next']
  },

  // ========== Step 2: 创建节点确认 ==========
  {
    id: 'create-node-confirm',
    page: 'MindMap',
    target: { type: 'dialog' },
    autoAction: {
      type: 'open-dialog',
      dialogType: 'OpenPrompt',
      description: '自动打开输入节点名称的弹窗'
    },
    requiredAction: {
      type: 'dialog-confirm',
      detectEvent: 'createNodeCompleted'
    },
    bubbleContent: '输入节点名称后点击「确定」',
    bubbleAfterAction: '请输入名称并点击「确定」',
    buttons: ['skip']
  },

  // ========== Step 3: 修改节点 ==========
  {
    id: 'edit-node',
    page: 'MindMap',
    target: { type: 'node' },  // 目标：第一个已有节点
    autoAction: {
      type: 'contextmenu',
      description: '自动触发右键菜单'
    },
    requiredAction: {
      type: 'click-menu-item',
      menuItem: 'edit',
      detectEvent: 'requestEditNode'
    },
    bubbleContent: '右键节点可以修改名称',
    bubbleAfterAction: '请点击菜单中的「修改节点」',
    buttons: ['skip', 'next']
  },

  // ========== Step 4: 修改节点确认 ==========
  {
    id: 'edit-node-confirm',
    page: 'MindMap',
    target: { type: 'dialog' },
    autoAction: {
      type: 'open-dialog',
      dialogType: 'OpenPrompt',
      description: '自动打开修改节点名称的弹窗'
    },
    requiredAction: {
      type: 'dialog-confirm',
      detectEvent: 'editNodeCompleted'
    },
    bubbleContent: '输入新名称后点击「确定」',
    bubbleAfterAction: '请输入新名称并点击「确定」',
    buttons: ['skip']
  },

  // ========== Step 5: 双击节点进入笔记 ==========
  {
    id: 'open-note',
    page: 'MindMap',
    target: { type: 'node' },
    autoAction: null,  // 用户自己双击
    requiredAction: {
      type: 'dblclick-node',
      detectEvent: 'navigateToNote'
    },
    bubbleContent: '双击节点可以进入笔记编辑页面',
    bubbleAfterAction: '请双击节点进入笔记页面',
    buttons: ['skip', 'next']
  },

  // ========== Step 6: 输入笔记内容 ==========
  {
    id: 'edit-note',
    page: 'Note',
    target: { type: 'editor' },
    autoAction: null,
    requiredAction: {
      type: 'type-in-editor',
      minCharacters: 1,
      detectEvent: 'noteContentChanged'
    },
    bubbleContent: '在这里输入你的笔记内容，支持 Markdown',
    bubbleAfterAction: '请输入一些内容',
    buttons: ['skip', 'next']
  },

  // ========== Step 7: 返回首页 ==========
  {
    id: 'back-to-map',
    page: 'Note',
    target: { type: 'keyboard' },
    autoAction: null,
    requiredAction: {
      type: 'press-key',
      key: 'Escape',
      detectEvent: 'navigateToMindMap'
    },
    bubbleContent: '按 Esc 可以返回思维导图',
    bubbleAfterAction: '请按 Esc 键',
    buttons: ['skip', 'next']
  },

  // ========== Step 8: 删除节点 ==========
  {
    id: 'delete-node',
    page: 'MindMap',
    target: { type: 'node' },
    autoAction: {
      type: 'contextmenu',
      description: '自动触发右键菜单'
    },
    requiredAction: {
      type: 'click-menu-item',
      menuItem: 'delete',
      detectEvent: 'requestDeleteNode'
    },
    bubbleContent: '右键节点可以删除，有子节点时会询问删除方式',
    bubbleAfterAction: '请点击菜单中的「删除节点」',
    buttons: ['skip', 'next']
  },

  // ========== Step 9: 进入设置页面 ==========
  {
    id: 'go-settings',
    page: 'MindMap→Settings',
    target: { type: 'sidebar-settings' },
    autoAction: {
      type: 'navigate',
      path: '/settings',
      description: '自动导航到设置页面'
    },
    requiredAction: null,  // 导航后自动进入下一步
    bubbleContent: '点击左侧「设置」按钮进入设置页面',
    bubbleAfterAction: '',
    buttons: ['skip', 'next']
  },

  // ========== Step 10: 修改目录 ==========
  {
    id: 'change-directory',
    page: 'Settings',
    target: { type: 'change-dir-button' },
    autoAction: {
      type: 'open-directory-dialog',
      description: '自动打开目录选择对话框'
    },
    requiredAction: {
      type: 'select-directory',
      detectEvent: 'directoryChanged'
    },
    bubbleContent: '点击「Change」可以修改数据存储目录',
    bubbleAfterAction: '请选择一个新目录',
    buttons: ['skip', 'next']
  },

  // ========== Step 11: 打开快捷键配置 ==========
  {
    id: 'open-shortcuts',
    page: 'Settings',
    target: { type: 'shortcuts-button' },
    autoAction: {
      type: 'click-button',
      buttonType: 'shortcuts',
      description: '自动点击快捷键配置按钮'
    },
    requiredAction: {
      type: 'dialog-opened',
      dialogType: 'ShortcutsModal',
      detectEvent: 'shortcutsModalOpened'
    },
    bubbleContent: '点击「配置」可以自定义快捷键',
    bubbleAfterAction: '请点击「配置」按钮',
    buttons: ['skip']
  }
];
```

---

## 4. 核心组件

### 4.1 组件结构

```
App
├── TutorialController          # 教程顶层控制器
│   ├── SelectionRing          # 虚线选中框
│   ├── BubbleTooltip          # 气泡提示框
│   └── PhaseHandler           # 阶段处理器
├── MindMap
│   └── ContextMenu
├── Note
└── Settings
    └── ShortcutsModal
```

### 4.2 TutorialController 伪代码

```javascript
// TutorialController.jsx
function TutorialController({ children }) {
  const [state, setState] = useState({
    isActive: false,
    currentStepIndex: 0,
    phase: 'idle'  // 'idle' | 'auto' | 'user-action'
  });

  const currentStep = TUTORIAL_STEPS[state.currentStepIndex];

  // ========== 点击「下一步」 ==========
  const handleNext = () => {
    if (!currentStep) return;

    if (currentStep.autoAction) {
      // Phase 1: 自动执行
      setState(s => ({ ...s, phase: 'auto' }));
      executeAutoAction(currentStep.autoAction);

      if (currentStep.requiredAction) {
        // 需要用户操作，进入 Phase 2
        setState(s => ({ ...s, phase: 'user-action' }));
      } else {
        // 无需用户操作，直接进入下一步
        advanceToNextStep();
      }
    } else {
      // 无 autoAction，等待用户操作
      setState(s => ({ ...s, phase: 'user-action' }));
    }
  };

  // ========== 检测到用户完成操作 ==========
  const handleUserActionCompleted = (eventType) => {
    if (state.phase !== 'user-action') return;
    if (!currentStep.requiredAction) return;
    if (!matchesEvent(currentStep.requiredAction, eventType)) return;

    // 用户完成了必需的操作，进入下一步
    advanceToNextStep();
  };

  // ========== 点击「跳过」 ==========
  const handleSkip = () => {
    completeTutorial();
  };

  // ========== 进入下一步 ==========
  const advanceToNextStep = () => {
    setState(s => ({
      ...s,
      currentStepIndex: s.currentStepIndex + 1,
      phase: 'idle'
    }));
  };

  // ========== 结束教程 ==========
  const completeTutorial = async () => {
    await window.api.saveSettings({ tutorialVersion: APP_VERSION });
    setState(s => ({ ...s, isActive: false, phase: 'idle' }));
  };

  if (!state.isActive) return children;

  return (
    <>
      {children}
      <SelectionRing target={currentStep.target} />
      <BubbleTooltip
        step={currentStep}
        phase={state.phase}
        onNext={handleNext}
        onSkip={handleSkip}
      />
    </>
  );
}
```

### 4.3 SelectionRing 组件

```javascript
// SelectionRing.jsx
function SelectionRing({ target, children }) {
  const [position, setPosition] = useState(null);
  const targetRef = useRef(null);

  useEffect(() => {
    if (!target) return;

    // 定位目标元素
    let element;
    switch (target.type) {
      case 'pane':
        element = document.querySelector('.react-flow__pane');
        break;
      case 'node':
        element = document.querySelector('.react-flow__node');
        break;
      case 'dialog':
        element = document.querySelector('[data-slot="dialog-content"]');
        break;
      case 'editor':
        element = document.querySelector('.ProseMirror');
        break;
      case 'sidebar-settings':
        element = document.querySelector('a[href="/settings"]');
        break;
      default:
        element = null;
    }

    if (element) {
      const rect = element.getBoundingClientRect();
      setPosition(rect);
    }
  }, [target]);

  if (!position) return null;

  return (
    <div
      className="selection-ring"
      style={{
        position: 'fixed',
        left: position.left - 8,
        top: position.top - 8,
        width: position.width + 16,
        height: position.height + 16,
        border: '2px dashed var(--link-color)',
        borderRadius: 8,
        animation: 'pulse 2s infinite',
        pointerEvents: 'none',
        zIndex: 9998,
      }}
    />
  );
}
```

### 4.4 BubbleTooltip 组件

```javascript
// BubbleTooltip.jsx
function BubbleTooltip({ step, phase, onNext, onSkip }) {
  const [position, setPosition] = useState('bottom');

  const content = phase === 'user-action'
    ? step.bubbleAfterAction
    : step.bubbleContent;

  const buttons = step.buttons || ['skip'];

  return (
    <div
      className="bubble-tooltip"
      style={{
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'var(--bg-primary)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '16px 24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        zIndex: 9999,
        minWidth: 280,
        maxWidth: 400,
      }}
    >
      <div className="bubble-content" style={{ marginBottom: 16 }}>
        {content}
      </div>
      <div className="bubble-buttons" style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        {buttons.includes('skip') && (
          <Button variant="outline" onClick={onSkip}>
            跳过
          </Button>
        )}
        {buttons.includes('next') && (
          <Button onClick={onNext}>
            下一步
          </Button>
        )}
      </div>
    </div>
  );
}
```

---

## 5. 自动执行器（AutoActionExecutor）

### 5.1 执行器实现

```javascript
// autoActionExecutor.js

const AutoActionExecutor = {
  // 执行右键菜单
  async contextmenu(target) {
    let element;
    switch (target.type) {
      case 'pane':
        element = document.querySelector('.react-flow__pane');
        break;
      case 'node':
        element = document.querySelector('.react-flow__node');
        break;
    }

    if (!element) return false;

    const rect = element.getBoundingClientRect();
    const event = new MouseEvent('contextmenu', {
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
      bubbles: true,
      cancelable: true,
      view: window
    });
    element.dispatchEvent(event);
    return true;
  },

  // 打开弹窗
  async openDialog(dialogType) {
    // dialogType: 'OpenPrompt' | 'ShortcutsModal'
    // 通过监听器等待弹窗打开后返回
    return new Promise((resolve) => {
      const observer = new MutationObserver((mutations) => {
        const dialog = document.querySelector('[data-slot="dialog-content"]');
        if (dialog) {
          observer.disconnect();
          resolve(true);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });

      // 超时 3 秒
      setTimeout(() => {
        observer.disconnect();
        resolve(false);
      }, 3000);
    });
  },

  // 导航到页面
  async navigate(path) {
    window.location.href = path;
    return new Promise((resolve) => {
      // 等待路由变化
      const unwatch = history.listen((location) => {
        if (location.pathname === path) {
          unwatch();
          resolve(true);
        }
      });
      // 超时 3 秒
      setTimeout(() => {
        unwatch();
        resolve(false);
      }, 3000);
    });
  },

  // 打开目录选择对话框
  async openDirectoryDialog() {
    // 调用现有的 API
    await window.api.selectDirectory();
    return true;
  },

  // 点击按钮
  async clickButton(buttonType) {
    let selector;
    switch (buttonType) {
      case 'shortcuts':
        selector = 'button:has-text("配置")';
        break;
      case 'change-dir':
        selector = 'button:has-text("Change")';
        break;
    }
    const button = document.querySelector(selector);
    if (button) {
      button.click();
      return true;
    }
    return false;
  }
};
```

---

## 6. 检测器（Detector）

### 6.1 检测事件列表

| 事件名 | 触发条件 | 检测方法 |
|--------|----------|----------|
| `requestCreateNode` | 创建节点 API 被调用 | 监听 notesData 变化 |
| `createNodeCompleted` | 创建节点弹窗确认 | 监听 notesData 新增记录 |
| `requestEditNode` | 修改节点 API 被调用 | 监听 notesData 变化 |
| `editNodeCompleted` | 修改节点弹窗确认 | 监听 notesData 更新记录 |
| `navigateToNote` | 路由跳转到 /note/:id/:name | 监听 history |
| `noteContentChanged` | 笔记内容发生改变 | 监听 notesData 更新 |
| `navigateToMindMap` | 路由跳转到 / | 监听 history |
| `requestDeleteNode` | 删除节点 API 被调用 | 监听 notesData 变化 |
| `directoryChanged` | storagePath 被修改 | 监听 settings 变化 |
| `shortcutsModalOpened` | 快捷键弹窗打开 | 监听 DOM |

### 6.2 检测器实现

```javascript
// detector.js

const Detector = {
  // 监听 notesData 变化
  watchNotesData(callback) {
    // 通过 proxy 拦截 notesData 的更新
    // 或者监听 db.notes 的变化事件
    const originalSetNotesData = setNotesData; // 从 useState 获取
    const proxiedSetNotesData = (...args) => {
      callback('notesDataChanged');
      return originalSetNotesData(...args);
    };
    return proxiedSetNotesData;
  },

  // 监听路由变化
  watchRoute(callback) {
    let lastPath = window.location.pathname;
    setInterval(() => {
      if (window.location.pathname !== lastPath) {
        lastPath = window.location.pathname;
        callback('routeChanged', window.location.pathname);
      }
    }, 100);
  },

  // 监听设置变化
  watchSettings(callback) {
    if (window.api.onSettingsChanged) {
      window.api.onSettingsChanged((newSettings) => {
        callback('settingsChanged', newSettings);
      });
    }
  },

  // 监听 DOM 弹窗
  watchDialogOpened(dialogType, callback) {
    const observer = new MutationObserver((mutations) => {
      const dialog = document.querySelector('[data-slot="dialog-content"]');
      if (dialog) {
        callback('dialogOpened', dialogType);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  },

  // 通用监听器
  createListener(eventType, callback) {
    switch (eventType) {
      case 'requestCreateNode':
      case 'requestEditNode':
      case 'requestDeleteNode':
        return this.watchNotesData(callback);
      case 'navigateToNote':
      case 'navigateToMindMap':
        return this.watchRoute(callback);
      case 'directoryChanged':
        return this.watchSettings(callback);
      case 'shortcutsModalOpened':
        return this.watchDialogOpened('ShortcutsModal', callback);
      default:
        return () => {};
    }
  }
};
```

---

## 7. 事件监听集成

### 7.1 与现有代码的集成点

教程系统需要监听以下事件来判断用户操作是否完成：

```javascript
// 在 TutorialController 中集成

// 监听 ContextMenu 的操作
const contextMenuRef = useRef();

// MindMap 的 requestCreateNode 被调用时
const originalRequestCreateNode = requestCreateNode;
requestCreateNode = (...args) => {
  originalRequestCreateNode(...args);
  tutorialRef.current?.onEvent('requestCreateNode');
};

// MindMap 的 requestEditNode 被调用时
const originalRequestEditNode = requestEditNode;
requestEditNode = (...args) => {
  originalRequestEditNode(...args);
  tutorialRef.current?.onEvent('requestEditNode');
};

// MindMap 的 requestDeleteNode 被调用时
const originalRequestDeleteNode = requestDeleteNode;
requestDeleteNode = (...args) => {
  originalRequestDeleteNode(...args);
  tutorialRef.current?.onEvent('requestDeleteNode');
};
```

### 7.2 暴露给 TutorialController 的接口

```javascript
// window.api 新增方法
window.tutorial = {
  // 通知教程系统事件发生
  notifyEvent: (eventType, data) => {
    tutorialControllerRef.current?.onEvent(eventType, data);
  },

  // 查询当前状态
  getState: () => tutorialState,

  // 强制完成当前步骤（跳过用）
  forceCompleteStep: () => {
    tutorialControllerRef.current?.forceComplete();
  }
};
```

---

## 8. 版本控制

### 8.1 版本号定义

```javascript
// package.json
const APP_VERSION = '1.0.0';
```

### 8.2 版本判断逻辑

```javascript
// 初始化教程时
async function initTutorial() {
  const settings = await window.api.getSettings();

  // 情况1: 首次使用（无 tutorialVersion）
  if (!settings.tutorialVersion) {
    return { shouldStart: true, steps: TUTORIAL_STEPS };
  }

  // 情况2: 已完成教程
  if (settings.tutorialVersion === APP_VERSION) {
    return { shouldStart: false };
  }

  // 情况3: 版本升级（预留，后续可能新增功能提示）
  if (settings.tutorialVersion < APP_VERSION) {
    // 返回新增功能的步骤
    const newSteps = getNewSteps(settings.tutorialVersion);
    return { shouldStart: true, steps: newSteps };
  }
}
```

### 8.3 完成教程时保存版本

```javascript
async function completeTutorial() {
  await window.api.saveSettings({ tutorialVersion: APP_VERSION });
}
```

---

## 9. 部署位置

### 9.1 新增文件列表

```
web/src/
├── components/
│   └── tutorial/
│       ├── TutorialController.jsx   # 顶层控制器
│       ├── SelectionRing.jsx        # 虚线选中框
│       ├── BubbleTooltip.jsx         # 气泡提示框
│       ├── autoActionExecutor.js     # 自动执行器
│       ├── detector.js               # 检测器
│       ├── TUTORIAL_STEPS.js         # 步骤定义
│       └── index.js                  # 导出
```

### 9.2 修改文件列表

```
web/src/
├── App.jsx                    # 引入 TutorialController
├── pages/MindMap.jsx          # 集成事件通知
└── main.jsx                   # 全局注入 window.tutorial
```

---

## 10. 详细步骤流程

### Step 1: 创建节点

```
┌──────────────────────────────────────────────────────────┐
│ Step 1: create-node                                     │
├──────────────────────────────────────────────────────────┤
│ 页面: MindMap                                           │
│ 目标: 画布空白区域 (.react-flow__pane)                   │
├──────────────────────────────────────────────────────────┤
│ Phase 1 (auto):                                         │
│   - 用户点击「下一步」                                    │
│   - AutoActionExecutor.contextmenu({ type: 'pane' })     │
│   - 自动在画布中心触发右键菜单事件                        │
│   - ContextMenu 弹出                                    │
├──────────────────────────────────────────────────────────┤
│ Phase 2 (user-action):                                   │
│   - Bubble 显示: "请点击菜单中的「创建节点」"              │
│   - 用户必须点击菜单项「➕ 创建节点」                      │
│   - 检测: onEvent('requestCreateNode')                   │
│   - 通过后进入 Step 2                                    │
└──────────────────────────────────────────────────────────┘
```

### Step 2: 创建节点确认

```
┌──────────────────────────────────────────────────────────┐
│ Step 2: create-node-confirm                              │
├──────────────────────────────────────────────────────────┤
│ 页面: MindMap                                           │
│ 目标: 弹窗 (.react-flow__pane + OpenPrompt)             │
├──────────────────────────────────────────────────────────┤
│ Phase 1 (auto):                                         │
│   - OpenPrompt 弹窗自动弹出（因为 Step 1 点击了创建节点） │
│   - Bubble 显示: "输入节点名称后点击「确定」"             │
├──────────────────────────────────────────────────────────┤
│ Phase 2 (user-action):                                   │
│   - 用户必须输入名称并点击「确定」                        │
│   - 检测: notesData 中出现新记录                         │
│   - 通过后进入 Step 3                                    │
└──────────────────────────────────────────────────────────┘
```

### Step 3: 修改节点

```
┌──────────────────────────────────────────────────────────┐
│ Step 3: edit-node                                       │
├──────────────────────────────────────────────────────────┤
│ 页面: MindMap                                           │
│ 目标: 第一个已有节点 (.react-flow__node)                 │
├──────────────────────────────────────────────────────────┤
│ Phase 1 (auto):                                         │
│   - 用户点击「下一步」                                    │
│   - AutoActionExecutor.contextmenu({ type: 'node' })     │
│   - 自动在第一个已有节点位置触发右键菜单                  │
│   - ContextMenu 弹出                                    │
├──────────────────────────────────────────────────────────┤
│ Phase 2 (user-action):                                   │
│   - Bubble 显示: "请点击菜单中的「修改节点」"              │
│   - 用户必须点击菜单项「✏️ 修改节点」                     │
│   - 检测: onEvent('requestEditNode')                     │
│   - 通过后进入 Step 4                                    │
└──────────────────────────────────────────────────────────┘
```

### Step 4: 修改节点确认

```
┌──────────────────────────────────────────────────────────┐
│ Step 4: edit-node-confirm                                │
├──────────────────────────────────────────────────────────┤
│ 页面: MindMap                                           │
│ 目标: OpenPrompt 弹窗                                   │
├──────────────────────────────────────────────────────────┤
│ Phase 1 (auto):                                         │
│   - OpenPrompt 弹窗自动弹出                              │
│   - Bubble 显示: "输入新名称后点击「确定」"               │
├──────────────────────────────────────────────────────────┤
│ Phase 2 (user-action):                                   │
│   - 用户必须输入新名称并点击「确定」                      │
│   - 检测: notesData 中对应记录 name 字段变化              │
│   - 通过后进入 Step 5                                    │
└──────────────────────────────────────────────────────────┘
```

### Step 5: 双击节点进入笔记

```
┌──────────────────────────────────────────────────────────┐
│ Step 5: open-note                                       │
├──────────────────────────────────────────────────────────┤
│ 页面: MindMap                                           │
│ 目标: 节点 (.react-flow__node)                          │
├──────────────────────────────────────────────────────────┤
│ Phase 1 (auto): 无                                      │
│   - 用户点击「下一步」                                    │
│   - Bubble 显示: "双击节点可以进入笔记编辑页面"          │
├──────────────────────────────────────────────────────────┤
│ Phase 2 (user-action):                                  │
│   - 用户必须双击任意节点                                │
│   - 检测: history 变化，pathname 变为 /note/:id/:name    │
│   - 通过后进入 Step 6                                    │
└──────────────────────────────────────────────────────────┘
```

### Step 6: 输入笔记内容

```
┌──────────────────────────────────────────────────────────┐
│ Step 6: edit-note                                       │
├──────────────────────────────────────────────────────────┤
│ 页面: Note                                              │
│ 目标: 编辑器 (.ProseMirror)                             │
├──────────────────────────────────────────────────────────┤
│ Phase 1 (auto): 无                                      │
│   - 用户点击「下一步」                                    │
│   - Bubble 显示: "在这里输入你的笔记内容，支持 Markdown"  │
├──────────────────────────────────────────────────────────┤
│ Phase 2 (user-action):                                  │
│   - 用户必须在编辑器中输入至少 1 个字符                   │
│   - 检测: ProseMirror 的 content 发生变化               │
│   - 通过后进入 Step 7                                     │
└──────────────────────────────────────────────────────────┘
```

### Step 7: 返回首页

```
┌──────────────────────────────────────────────────────────┐
│ Step 7: back-to-map                                      │
├──────────────────────────────────────────────────────────┤
│ 页面: Note                                              │
│ 目标: 键盘 (Esc 键)                                     │
├──────────────────────────────────────────────────────────┤
│ Phase 1 (auto): 无                                      │
│   - 用户点击「下一步」                                    │
│   - Bubble 显示: "按 Esc 可以返回思维导图"                │
├──────────────────────────────────────────────────────────┤
│ Phase 2 (user-action):                                  │
│   - 用户必须按 Escape 键                                 │
│   - 检测: history 变化，pathname 变为 /                  │
│   - 通过后进入 Step 8                                     │
└──────────────────────────────────────────────────────────┘
```

### Step 8: 删除节点

```
┌──────────────────────────────────────────────────────────┐
│ Step 8: delete-node                                      │
├──────────────────────────────────────────────────────────┤
│ 页面: MindMap                                           │
│ 目标: 已有节点                                          │
├──────────────────────────────────────────────────────────┤
│ Phase 1 (auto):                                         │
│   - 用户点击「下一步」                                    │
│   - AutoActionExecutor.contextmenu({ type: 'node' })     │
│   - 自动在已有节点位置触发右键菜单                       │
│   - ContextMenu 弹出                                    │
├──────────────────────────────────────────────────────────┤
│ Phase 2 (user-action):                                   │
│   - Bubble 显示: "请点击菜单中的「删除节点」"             │
│   - 用户必须点击菜单项「🗑 删除节点」                     │
│   - 检测: onEvent('requestDeleteNode')                  │
│   - 通过后进入 Step 9                                     │
└──────────────────────────────────────────────────────────┘
```

### Step 9: 进入设置页面

```
┌──────────────────────────────────────────────────────────┐
│ Step 9: go-settings                                      │
├──────────────────────────────────────────────────────────┤
│ 页面: MindMap → Settings                                │
│ 目标: 侧边栏「设置」链接                                 │
├──────────────────────────────────────────────────────────┤
│ Phase 1 (auto):                                         │
│   - 用户点击「下一步」                                    │
│   - AutoActionExecutor.navigate('/settings')             │
│   - 自动导航到 Settings 页面                             │
├──────────────────────────────────────────────────────────┤
│ Phase 2 (user-action): 无                               │
│   - 导航完成后自动进入 Step 10                           │
└──────────────────────────────────────────────────────────┘
```

### Step 10: 修改目录

```
┌──────────────────────────────────────────────────────────┐
│ Step 10: change-directory                                │
├──────────────────────────────────────────────────────────┤
│ 页面: Settings                                          │
│ 目标: Change 按钮                                       │
├──────────────────────────────────────────────────────────┤
│ Phase 1 (auto):                                         │
│   - 用户点击「下一步」                                    │
│   - AutoActionExecutor.openDirectoryDialog()            │
│   - 自动打开目录选择对话框                               │
├──────────────────────────────────────────────────────────┤
│ Phase 2 (user-action):                                  │
│   - 用户必须选择目录（点击确定）                         │
│   - 检测: settings.storagePath 发生变化                 │
│   - 通过后进入 Step 11                                   │
└──────────────────────────────────────────────────────────┘
```

### Step 11: 打开快捷键配置

```
┌──────────────────────────────────────────────────────────┐
│ Step 11: open-shortcuts                                  │
├──────────────────────────────────────────────────────────┤
│ 页面: Settings                                          │
│ 目标: 快捷键配置按钮                                    │
├──────────────────────────────────────────────────────────┤
│ Phase 1 (auto):                                         │
│   - 用户点击「下一步」                                    │
│   - AutoActionExecutor.clickButton('shortcuts')         │
│   - 自动点击「配置」按钮                                 │
│   - ShortcutsModal 弹窗打开                            │
├──────────────────────────────────────────────────────────┤
│ Phase 2 (user-action):                                  │
│   - Bubble 显示: "点击任意快捷键可以自定义快捷键"      │
│   - 用户点击任意快捷键条目                               │
│   - 检测: ShortcutsModal 显示且用户点击了快捷键          │
│   - 通过后教程完成                                       │
└──────────────────────────────────────────────────────────┘
```

---

## 11. 边界情况处理

### 11.1 用户关闭菜单/弹窗未操作

```javascript
// 检测到 ContextMenu 或 Dialog 被关闭但用户未点击任何选项
const handleDialogClose = () => {
  if (state.phase === 'user-action' && !hasUserActed) {
    // 重新显示冒泡，提示用户需要操作
    setBubbleContent(step.bubbleAfterAction);
  }
};
```

### 11.2 用户直接关闭教程（点 X 或 ESC）

```javascript
// 效果等同于点「跳过」
const handleTutorialClose = () => {
  completeTutorial();
};
```

### 11.3 页面刷新

```javascript
// 刷新后重新检测状态
useEffect(() => {
  const checkTutorialState = async () => {
    const shouldStart = await initTutorial();
    if (!shouldStart) return;

    // 检查当前页面是否符合当前步骤的预期页面
    const expectedPage = TUTORIAL_STEPS[currentStepIndex].page;
    if (!isOnPage(expectedPage)) {
      // 导航到正确页面
      navigateToPage(expectedPage);
    }
  };

  checkTutorialState();
}, []);
```

### 11.4 超时处理

```javascript
// 每个 user-action 步骤设置超时
const USER_ACTION_TIMEOUT = 30000; // 30 秒

useEffect(() => {
  if (state.phase !== 'user-action') return;

  const timeoutId = setTimeout(() => {
    // 超时后提示用户
    showTimeoutMessage();
  }, USER_ACTION_TIMEOUT);

  return () => clearTimeout(timeoutId);
}, [state.phase]);
```

---

## 12. 样式与动画

### 12.1 SelectionRing 样式

```css
@keyframes pulse {
  0%, 100% {
    border-color: var(--link-color);
    box-shadow: 0 0 0 0 rgba(var(--link-color-rgb), 0.4);
  }
  50% {
    border-color: var(--link-color);
    box-shadow: 0 0 0 8px rgba(var(--link-color-rgb), 0);
  }
}

.selection-ring {
  animation: pulse 2s ease-in-out infinite;
  pointer-events: none;
}
```

### 12.2 BubbleTooltip 样式

```css
.bubble-tooltip {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
}
```

---

## 13. 测试用例

### 13.1 基础流程测试

- [ ] 首次打开应用，教程自动弹出 Step 1
- [ ] 点「下一步」，自动打开右键菜单
- [ ] 点「创建节点」，自动进入 Step 2
- [ ] 完成所有步骤，`tutorialVersion` 被正确保存

### 13.2 跳过测试

- [ ] 点「跳过」，教程关闭，`tutorialVersion` 被保存
- [ ] 关闭应用重新打开，教程不再弹出

### 13.3 中途操作测试

- [ ] 在教程过程中用户自己操作了右键，教程能正确检测并进入下一步
- [ ] 教程过程中用户关闭了菜单，冒泡重新显示提示用户

### 13.4 页面切换测试

- [ ] Step 9 自动导航到 Settings 页面
- [ ] 导航过程没有闪烁或延迟