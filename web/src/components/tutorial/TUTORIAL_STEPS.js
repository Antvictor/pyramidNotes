export const APP_VERSION = '1.0.0';

export const TUTORIAL_STEPS = [
  // ========== Step 1: 创建节点 ==========
  {
    id: 'create-node',
    page: 'MindMap',
    target: { type: 'pane' },
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
    target: { type: 'node' },
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
    autoAction: null,
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
    requiredAction: null,
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