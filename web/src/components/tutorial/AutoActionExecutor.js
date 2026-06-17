/**
 * AutoActionExecutor - 执行自动动作，如触发右键菜单、导航、点击按钮等
 * 这是新手教程（冒泡引导）系统的一部分
 */

export async function executeAutoAction(autoAction, target, navigate) {
  if (!autoAction) return { success: false, reason: 'no autoAction' };

  switch (autoAction.type) {
    case 'contextmenu':
      return executeContextmenu(target || autoAction.target);
    case 'navigate':
      return executeNavigate(autoAction.path, navigate);
    case 'open-directory-dialog':
      return executeOpenDirectoryDialog();
    case 'click-button':
      return executeClickButton(autoAction.buttonType);
    case 'open-dialog':
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
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  // 在目标元素上触发，让事件冒泡到 React Flow 的事件委托层
  element.dispatchEvent(new MouseEvent('contextmenu', {
    clientX: cx,
    clientY: cy,
    screenX: cx,
    screenY: cy,
    button: 2,
    buttons: 2,
    bubbles: true,
    cancelable: true,
    view: window
  }));

  return { success: true };
}

/**
 * 导航到指定路径（优先使用 React Router navigate）
 */
async function executeNavigate(path, navigate) {
  if (navigate) {
    navigate(path);
    return { success: true };
  }
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
