export const APP_VERSION = '2.0.0';

export const TUTORIAL_STEPS = [
  // ========== Step 1: 右键菜单功能介绍 ==========
  {
    id: 'context-menu-intro',
    page: 'MindMap',
    target: { type: 'node' },
    bubbleContent: '欢迎使用 Pyramid Notes！接下来将引导你了解右键菜单的功能。点击「下一步」开始',
    autoAction: {
      type: 'contextmenu',
      description: '自动触发右键菜单'
    },
    subSteps: [
      {
        target: { type: 'menu-item', value: 'create' },
        bubbleContent: '「创建节点」— 在当前节点下创建一个新的子节点',
        buttons: ['skip', 'next']
      },
      {
        target: { type: 'menu-item', value: 'edit' },
        bubbleContent: '「修改节点」— 修改当前节点的名称',
        buttons: ['skip', 'next']
      },
      {
        target: { type: 'menu-item', value: 'delete' },
        bubbleContent: '「删除节点」— 删除当前节点，有子节点时会询问删除方式',
        buttons: ['skip', 'next']
      },
      {
        target: { type: 'menu-item', value: 'create' },
        bubbleContent: '现在请点击「创建节点」来体验一下！',
        bubbleAfterAction: '请点击菜单中的「创建节点」',
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
    bubbleContent: '请输入节点名称后点击「确定」来完成创建',
    bubbleAfterAction: '请输入名称并点击「确定」',
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
    bubbleContent: '双击任意节点进入编辑模式，查看节点内容',
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
    bubbleContent: '按 ESC 键退出编辑模式，返回脑图',
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
    bubbleContent: '节点操作演示完成！点击下一步前往设置页面',
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
    bubbleContent: '点击「Change」按钮可以修改数据存储目录',
    bubbleAfterAction: '请选择一个目录作为数据存储位置',
    buttons: ['skip']
  }
];
