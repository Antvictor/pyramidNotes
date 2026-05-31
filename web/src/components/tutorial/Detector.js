/**
 * Detector - 监听各种事件，判断用户操作是否完成
 *
 * 用于新手教程（冒泡引导）系统，监听用户操作阶段的各种事件。
 */

export const Detector = {
  /**
   * 监听 notesData 变化
   * @param {Function} callback - 回调函数，接收 (eventType, data)
   * @returns {Function} unsubscribe - 取消监听函数
   */
  watchNotesData(callback) {
    let lastNotesData = null;
    let lastCheckTime = Date.now();

    // 定期检查 notesData 的变化
    const checkInterval = setInterval(() => {
      const notesDataEl = document.querySelector('#notes-data-store');
      if (!notesDataEl) return;

      try {
        const currentData = JSON.parse(notesDataEl.textContent || '[]');

        if (lastNotesData === null) {
          lastNotesData = currentData;
          return;
        }

        // 检测新增
        const addedIds = currentData.filter(
          c => !lastNotesData.find(l => l.id === c.id)
        );
        if (addedIds.length > 0 && Date.now() - lastCheckTime > 100) {
          callback('createNodeCompleted', addedIds);
        }

        // 检测更新
        const updatedIds = currentData.filter(c => {
          const last = lastNotesData.find(l => l.id === c.id);
          return last && (last.name !== c.name || last.content !== c.content);
        });
        if (updatedIds.length > 0 && Date.now() - lastCheckTime > 100) {
          callback('editNodeCompleted', updatedIds);
        }

        // 检测删除
        const deletedIds = lastNotesData.filter(
          l => !currentData.find(c => c.id === l.id)
        );
        if (deletedIds.length > 0 && Date.now() - lastCheckTime > 100) {
          callback('deleteNodeCompleted', deletedIds);
        }

        lastNotesData = currentData;
        lastCheckTime = Date.now();
      } catch (e) {
        // ignore parse errors
      }
    }, 100);

    return () => clearInterval(checkInterval);
  },

  /**
   * 监听路由变化
   * @param {Function} callback - 回调函数，接收 (eventType, data)
   * @returns {Function} unsubscribe - 取消监听函数
   */
  watchRoute(callback) {
    let lastPath = window.location.pathname;

    const intervalId = setInterval(() => {
      const currentPath = window.location.pathname;
      if (currentPath !== lastPath) {
        lastPath = currentPath;

        // 判断路由类型
        if (currentPath === '/') {
          callback('routeChanged', { type: 'mindmap', path: currentPath });
        } else if (currentPath.match(/^\/note\/.+/)) {
          callback('routeChanged', { type: 'note', path: currentPath });
        } else {
          callback('routeChanged', { type: 'other', path: currentPath });
        }
      }
    }, 100);

    return () => clearInterval(intervalId);
  },

  /**
   * 监听设置变化
   * @param {Function} callback - 回调函数，接收 (eventType, data)
   * @returns {Function} unsubscribe - 取消监听函数
   */
  watchSettings(callback) {
    if (window.api && typeof window.api.onSettingsChanged === 'function') {
      const unsubscribe = window.api.onSettingsChanged((newSettings) => {
        callback('settingsChanged', newSettings);
      });
      return unsubscribe;
    }
    return () => {};
  },

  /**
   * 监听 DOM 弹窗
   * @param {string} dialogType - 弹窗类型
   * @param {Function} callback - 回调函数，接收 (eventType, data)
   * @returns {Function} unsubscribe - 取消监听函数
   */
  watchDialogOpened(dialogType, callback) {
    const observer = new MutationObserver((mutations) => {
      const dialog = document.querySelector('[data-slot="dialog-content"]');
      if (dialog) {
        // 检查弹窗类型
        const isCorrectDialog =
          dialogType === 'ShortcutsModal'
            ? dialog.querySelector('h2')?.textContent?.includes('快捷键')
            : true;

        if (isCorrectDialog) {
          callback('dialogOpened', { type: dialogType, dialog });
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  },

  /**
   * 监听节点创建请求
   * @param {Function} callback - 回调函数
   * @returns {Function} unsubscribe
   */
  watchCreateRequest(callback) {
    // 监听右键菜单中的创建操作
    const handler = (event) => {
      if (event.target.closest('[data-menu-item="create"]')) {
        callback('requestCreateNode', {});
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  },

  /**
   * 监听节点编辑请求
   * @param {Function} callback - 回调函数
   * @returns {Function} unsubscribe
   */
  watchEditRequest(callback) {
    const handler = (event) => {
      if (event.target.closest('[data-menu-item="edit"]')) {
        callback('requestEditNode', {});
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  },

  /**
   * 监听节点删除请求
   * @param {Function} callback - 回调函数
   * @returns {Function} unsubscribe
   */
  watchDeleteRequest(callback) {
    const handler = (event) => {
      if (event.target.closest('[data-menu-item="delete"]')) {
        callback('requestDeleteNode', {});
      }
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  },

  /**
   * 通用监听器 - 根据 eventType 分发到具体的 watch 方法
   * @param {string} eventType - 事件类型
   * @param {Function} callback - 回调函数
   * @returns {Function} unsubscribe - 取消监听函数
   */
  createListener(eventType, callback) {
    switch (eventType) {
      case 'requestCreateNode':
        return this.watchCreateRequest(callback);
      case 'requestEditNode':
        return this.watchEditRequest(callback);
      case 'requestDeleteNode':
        return this.watchDeleteRequest(callback);
      case 'createNodeCompleted':
      case 'editNodeCompleted':
      case 'deleteNodeCompleted':
        return this.watchNotesData(callback);
      case 'navigateToNote':
        return this._createNavigateListener(callback, /^\/note\/.+/);
      case 'navigateToMindMap':
        return this._createNavigateListener(callback, /^\/$/);
      case 'noteContentChanged':
        return this.watchNotesData(callback);
      case 'directoryChanged':
        return this.watchSettings(callback);
      case 'shortcutsModalOpened':
        return this.watchDialogOpened('ShortcutsModal', callback);
      default:
        return () => {};
    }
  },

  /**
   * 创建导航监听器
   * @private
   */
  _createNavigateListener(callback, pathPattern) {
    let lastPath = window.location.pathname;
    const self = this;

    const intervalId = setInterval(() => {
      const currentPath = window.location.pathname;
      if (currentPath !== lastPath && pathPattern.test(currentPath)) {
        lastPath = currentPath;
        // Determine the event type based on the pattern
        const eventType = pathPattern === /^\/$/
          ? 'navigateToMindMap'
          : 'navigateToNote';
        callback(eventType, { path: currentPath });
      }
    }, 100);

    return () => clearInterval(intervalId);
  }
};

export default Detector;