export const APP_VERSION = '2.0.0';

export const TUTORIAL_STEPS = [
  // ========== Step 1: 右键菜单功能介绍 ==========
  {
    id: 'context-menu-intro',
    page: 'MindMap',
    target: { type: 'node' },
    bubbleContentKey: 'tutorial.steps.contextMenu.intro',
    autoAction: {
      type: 'contextmenu',
      description: '自动触发右键菜单'
    },
    subSteps: [
      {
        target: { type: 'menu-item', value: 'create' },
        bubbleContentKey: 'tutorial.steps.contextMenu.create',
        buttons: ['skip', 'next']
      },
      {
        target: { type: 'menu-item', value: 'edit' },
        bubbleContentKey: 'tutorial.steps.contextMenu.rename',
        buttons: ['skip', 'next']
      },
      {
        target: { type: 'menu-item', value: 'delete' },
        bubbleContentKey: 'tutorial.steps.contextMenu.delete',
        buttons: ['skip', 'next']
      },
      {
        target: { type: 'menu-item', value: 'create' },
        bubbleContentKey: 'tutorial.steps.contextMenu.tryCreate',
        bubbleAfterActionKey: 'tutorial.steps.contextMenu.tryCreateAction',
        requiredAction: {
          type: 'click-menu-item',
          menuItem: 'create',
          detectEvent: 'requestCreateNode'
        },
        buttons: ['skip']
      }
    ],
    buttons: ['skip', 'next']
  },

  // ========== Step 2: 确认创建节点 ==========
  {
    id: 'create-node-confirm',
    page: 'MindMap',
    target: { type: 'dialog' },
    autoAction: null,
    requiredAction: {
      type: 'dialog-close',
      detectEvent: 'dialogClosed'
    },
    bubbleContentKey: 'tutorial.steps.createDialog.prompt',
    bubbleAfterActionKey: 'tutorial.steps.createDialog.action',
    buttons: ['skip']
  },

  // ========== Step 3: 双击编辑 ==========
  {
    id: 'edit-intro',
    page: 'MindMap',
    target: { type: 'node' },
    autoAction: null,
    requiredAction: {
      type: 'navigate-to-editor',
      detectEvent: 'routeChanged'
    },
    bubbleContentKey: 'tutorial.steps.openEditor',
    buttons: ['skip']
  },

  // ========== Step 4: 按 ESC 退出编辑 ==========
  {
    id: 'edit-exit',
    page: 'Note',
    target: { type: 'keyboard' },
    autoAction: null,
    requiredAction: {
      type: 'escape-to-exit',
      detectEvent: 'routeChanged'
    },
    bubbleContentKey: 'tutorial.steps.exitEditor',
    buttons: ['skip']
  },

  // ========== Step 5: 进入设置页面 ==========
  {
    id: 'go-settings',
    page: 'Settings',
    target: { type: 'sidebar-settings' },
    autoAction: {
      type: 'navigate',
      path: '/settings',
      description: '自动导航到设置页面'
    },
    requiredAction: null,
    bubbleContentKey: 'tutorial.steps.openSettings',
    buttons: ['skip', 'next']
  },

  // ========== Step 4: 配置目录地址 ==========
  {
    id: 'change-directory',
    page: 'Settings',
    target: { type: 'change-dir-button' },
    autoAction: {
      type: 'click-button',
      buttonType: 'change-dir',
      description: '自动点击 Change 按钮'
    },
    requiredAction: {
      type: 'select-directory',
      detectEvent: 'directoryChanged'
    },
    bubbleContentKey: 'tutorial.steps.changeDirectory',
    bubbleAfterActionKey: 'tutorial.steps.changeDirectoryAction',
    buttons: ['skip']
  }
];
