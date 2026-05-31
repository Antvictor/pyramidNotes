/**
 * AutoActionExecutor - 执行自动动作，如触发右键菜单、导航、点击按钮等
 * 这是新手教程（冒泡引导）系统的一部分
 */

export async function executeAutoAction(autoAction) {
  if (!autoAction) return { success: false, reason: 'no autoAction' };

  switch (autoAction.type) {
    case 'contextmenu':
      return executeContextmenu(autoAction.target);
    case 'navigate':
      return executeNavigate(autoAction.path);
    case 'open-directory-dialog':
      return executeOpenDirectoryDialog();
    case 'click-button':
      return executeClickButton(autoAction.buttonType);
    case 'open-dialog':
      // 通过 MutationObserver 检测弹窗
      return { success: true };
    default:
      return { success: false, reason: 'unknown action type' };
  }
}

/**
 * 触发右键菜单
 */
async function executeContextmenu(target) {
  let element;
  switch (target.type) {
    case 'pane':
      element = document.querySelector('.react-flow__pane');
      break;
    case 'node':
      element = document.querySelector('.react-flow__node');
      break;
    default:
      return { success: false, reason: 'unknown target type' };
  }

  if (!element) return { success: false, reason: 'element not found' };

  const rect = element.getBoundingClientRect();
  const event = new MouseEvent('contextmenu', {
    clientX: rect.left + rect.width / 2,
    clientY: rect.top + rect.height / 2,
    bubbles: true,
    cancelable: true,
    view: window
  });
  element.dispatchEvent(event);
  return { success: true };
}

/**
 * 导航到指定路径
 */
async function executeNavigate(path) {
  window.location.href = path;
  return { success: true };
}

/**
 * 打开目录选择对话框
 */
async function executeOpenDirectoryDialog() {
  await window.api.selectDirectory();
  return { success: true };
}

/**
 * 点击按钮
 */
async function executeClickButton(buttonType) {
  let button;
  switch (buttonType) {
    case 'shortcuts':
      button = Array.from(document.querySelectorAll('button')).find(
        btn => btn.textContent.includes('配置')
      );
      break;
    case 'change-dir':
      button = Array.from(document.querySelectorAll('button')).find(
        btn => btn.textContent.includes('Change')
      );
      break;
    default:
      return { success: false, reason: 'unknown button type' };
  }

  if (!button) return { success: false, reason: 'button not found' };

  button.click();
  return { success: true };
}