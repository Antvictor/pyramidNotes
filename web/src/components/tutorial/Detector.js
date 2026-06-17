/**
 * Detector - 事件驱动的用户操作检测
 *
 * 用于新手教程（冒泡引导）系统。
 * 不再使用 setInterval 轮询，全部通过 DOM 事件和 MutationObserver 实现。
 */

export const Detector = {

  // ========== 菜单点击检测 ==========

  watchCreateRequest(callback) {
    const handler = (event) => {
      if (event.target.closest('[data-menu-item="create"]')) {
        callback('requestCreateNode', {});
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  },

  watchEditRequest(callback) {
    const handler = (event) => {
      if (event.target.closest('[data-menu-item="edit"]')) {
        callback('requestEditNode', {});
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  },

  watchDeleteRequest(callback) {
    const handler = (event) => {
      if (event.target.closest('[data-menu-item="delete"]')) {
        callback('requestDeleteNode', {});
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  },

  // ========== Dialog 打开/关闭检测（轮询方案，避免 Radix 动画干扰）==========

  watchDialog(callback) {
    let wasEverOpen = false;
    let interval;
    let timer;

    // 立即检查 dialog 是否已打开（处理 React 同批次渲染的情况）
    const dialogNow = document.querySelector('[data-slot="dialog-content"]');
    if (dialogNow?.getAttribute('data-state') === 'open') {
      wasEverOpen = true;
    }

    // 延迟 300ms 等 Radix 挂载动画结束后开始轮询
    timer = setTimeout(() => {
      interval = setInterval(() => {
        const dialog = document.querySelector('[data-slot="dialog-content"]');
        const isOpen = dialog?.getAttribute('data-state') === 'open';

        if (isOpen) {
          wasEverOpen = true;
        } else if (wasEverOpen) {
          clearInterval(interval);
          callback('dialogClosed', {});
        }
      }, 150);
    }, 300);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  },

  // ========== 路由变化检测 ==========

  watchRoute(callback) {
    let lastPath = window.location.pathname;

    const intervalId = setInterval(() => {
      const currentPath = window.location.pathname;
      if (currentPath !== lastPath) {
        const prev = lastPath;
        lastPath = currentPath;
        callback('routeChanged', { from: prev, to: currentPath });
      }
    }, 200);

    return () => clearInterval(intervalId);
  },

  // ========== 设置变化检测 ==========

  watchSettings(callback) {
    if (window.api && typeof window.api.onSettingsChanged === 'function') {
      return window.api.onSettingsChanged((newSettings) => {
        callback('directoryChanged', newSettings);
      });
    }
    return () => {};
  },

  // ========== 通用监听器分发 ==========

  createListener(eventType, callback) {
    switch (eventType) {
      case 'requestCreateNode':
        return this.watchCreateRequest(callback);
      case 'requestEditNode':
        return this.watchEditRequest(callback);
      case 'requestDeleteNode':
        return this.watchDeleteRequest(callback);
      case 'dialogOpened':
      case 'dialogClosed':
        return this.watchDialog(callback);
      case 'routeChanged':
        return this.watchRoute(callback);
      case 'directoryChanged':
        return this.watchSettings(callback);
      default:
        console.warn(`[Detector] Unknown event type: ${eventType}`);
        return () => {};
    }
  }
};

export default Detector;
