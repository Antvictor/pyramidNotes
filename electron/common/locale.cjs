const { app, Menu } = require('electron')

const LANGUAGE_PREFERENCES = ['system', 'zh-CN', 'en']

function normalizeLanguagePreference(value) {
  return LANGUAGE_PREFERENCES.includes(value) ? value : 'system'
}

function isSimplifiedChinese(language) {
  const normalized = String(language || '').toLowerCase()
  return normalized === 'zh'
    || normalized.startsWith('zh-cn')
    || normalized.startsWith('zh-sg')
    || normalized.startsWith('zh-hans')
}

function resolveLanguage(preference, systemLanguages = []) {
  const normalizedPreference = normalizeLanguagePreference(preference)
  if (normalizedPreference !== 'system') return normalizedPreference

  for (const language of systemLanguages) {
    if (isSimplifiedChinese(language)) return 'zh-CN'
    if (String(language).toLowerCase().startsWith('en')) return 'en'
  }
  return 'en'
}

const MENU_LABELS = {
  en: {
    app: 'Pyramid Notes',
    about: 'About Pyramid Notes',
    quit: 'Quit Pyramid Notes',
    edit: 'Edit',
    undo: 'Undo',
    redo: 'Redo',
    cut: 'Cut',
    copy: 'Copy',
    paste: 'Paste',
    selectAll: 'Select All',
    view: 'View',
    reload: 'Reload',
    forceReload: 'Force Reload',
    toggleDevTools: 'Toggle Developer Tools',
    resetZoom: 'Actual Size',
    zoomIn: 'Zoom In',
    zoomOut: 'Zoom Out',
    fullscreen: 'Toggle Full Screen',
    window: 'Window',
    minimize: 'Minimize',
    close: 'Close',
  },
  'zh-CN': {
    app: 'Pyramid Notes',
    about: '关于 Pyramid Notes',
    quit: '退出 Pyramid Notes',
    edit: '编辑',
    undo: '撤销',
    redo: '重做',
    cut: '剪切',
    copy: '复制',
    paste: '粘贴',
    selectAll: '全选',
    view: '视图',
    reload: '重新加载',
    forceReload: '强制重新加载',
    toggleDevTools: '切换开发者工具',
    resetZoom: '实际大小',
    zoomIn: '放大',
    zoomOut: '缩小',
    fullscreen: '切换全屏',
    window: '窗口',
    minimize: '最小化',
    close: '关闭',
  },
}

function getMenuLabels(language) {
  return MENU_LABELS[language] || MENU_LABELS.en
}

function buildApplicationMenu(language) {
  const labels = getMenuLabels(language)
  const template = [
    ...(process.platform === 'darwin'
      ? [{
          label: labels.app,
          submenu: [
            { role: 'about', label: labels.about },
            { type: 'separator' },
            { role: 'quit', label: labels.quit },
          ],
        }]
      : []),
    {
      label: labels.edit,
      submenu: [
        { role: 'undo', label: labels.undo },
        { role: 'redo', label: labels.redo },
        { type: 'separator' },
        { role: 'cut', label: labels.cut },
        { role: 'copy', label: labels.copy },
        { role: 'paste', label: labels.paste },
        { role: 'selectAll', label: labels.selectAll },
      ],
    },
    {
      label: labels.view,
      submenu: [
        { role: 'reload', label: labels.reload },
        { role: 'forceReload', label: labels.forceReload },
        { role: 'toggleDevTools', label: labels.toggleDevTools },
        { type: 'separator' },
        { role: 'resetZoom', label: labels.resetZoom },
        { role: 'zoomIn', label: labels.zoomIn },
        { role: 'zoomOut', label: labels.zoomOut },
        { type: 'separator' },
        { role: 'togglefullscreen', label: labels.fullscreen },
      ],
    },
    {
      label: labels.window,
      submenu: [
        { role: 'minimize', label: labels.minimize },
        { role: 'close', label: labels.close },
      ],
    },
  ]
  return Menu.buildFromTemplate(template)
}

function getSystemLanguages() {
  const locale = app.getLocale()
  const preferred = typeof app.getPreferredSystemLanguages === 'function'
    ? app.getPreferredSystemLanguages()
    : []
  return [...preferred, locale].filter(Boolean)
}

function applyApplicationMenu(preference) {
  const language = resolveLanguage(preference, getSystemLanguages())
  Menu.setApplicationMenu(buildApplicationMenu(language))
  return language
}

function getWindowTitle() {
  return 'Pyramid Notes'
}

module.exports = {
  normalizeLanguagePreference,
  resolveLanguage,
  getMenuLabels,
  buildApplicationMenu,
  applyApplicationMenu,
  getWindowTitle,
}
