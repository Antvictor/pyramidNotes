export function findTutorialTarget(target) {
  if (!target) return null;

  switch (target.type) {
    case 'pane':
      return document.querySelector('.react-flow__pane');
    case 'node':
      return document.querySelector('.react-flow__node');
    case 'dialog':
      return document.querySelector('[data-slot="dialog-content"]');
    case 'editor':
      return document.querySelector('.ProseMirror');
    case 'sidebar-settings':
      return document.querySelector('[data-tutorial-id="sidebar-settings"]');
    case 'change-dir-button':
      return document.querySelector('[data-tutorial-id="change-storage-directory"]');
    case 'shortcuts-button':
      return document.querySelector('[data-tutorial-id="open-shortcuts"]');
    case 'menu-item':
      return document.querySelector(`[data-menu-item="${target.value}"]`);
    case 'keyboard':
      return null;
    default:
      return null;
  }
}
