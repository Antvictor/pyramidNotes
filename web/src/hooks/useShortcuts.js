import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelectedNode } from '../contexts/SelectedNodeContext';

function matchShortcut(e, shortcutStr) {
  if (!shortcutStr) return false;

  const isMod = e.ctrlKey || e.metaKey;
  const isShift = e.shiftKey;
  const isAlt = e.altKey;

  const parts = shortcutStr.split('+');
  const modifiers = parts.slice(0, -1);
  const key = parts[parts.length - 1];

  const needsCtrl = modifiers.includes('Ctrl');
  const needsShift = modifiers.includes('Shift');
  const needsAlt = modifiers.includes('Alt');
  const modStateMatch =
    (needsCtrl === isMod) &&
    (needsShift === isShift) &&
    (needsAlt === isAlt);

  const keyMatch =
    key === 'Escape' ? e.key === 'Escape' :
    key === 'Delete' ? e.key === 'Delete' :
    key === 'Enter' ? e.key === 'Enter' :
    key === 'Backspace' ? e.key === 'Backspace' :
    /^F\d+$/.test(key) ? e.key === key :
    e.key.toLowerCase() === key.toLowerCase();

  return keyMatch && modStateMatch;
}

export function useShortcuts({ onNewNode, onRenameNode, onDeleteNode, onOpenSearch, onBackToMap }) {
  const { selectedNode, shortcuts } = useSelectedNode();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!shortcuts) return;

    const handler = (e) => {
      const path = location.pathname;

      // Global shortcuts (work in all pages)
      if (matchShortcut(e, shortcuts.global?.search)) {
        e.preventDefault();
        onOpenSearch?.();
        return;
      }

      if (path === '/' || path === '') {
        // MindMap page
        if (matchShortcut(e, shortcuts.node?.deleteNode)) {
          e.preventDefault();
          if (selectedNode) {
            onDeleteNode?.();
          }
          return;
        }

        if (matchShortcut(e, shortcuts.global?.backToMap)) {
          e.preventDefault();
          // Esc in MindMap: if search is open, close it; otherwise clear selection
          onBackToMap?.();
          return;
        }

        if (selectedNode) {
          // Node operations require selection
          if (matchShortcut(e, shortcuts.node?.newNode)) {
            e.preventDefault();
            onNewNode?.(selectedNode.id);
            return;
          }

          if (matchShortcut(e, shortcuts.node?.renameNode)) {
            e.preventDefault();
            onRenameNode?.(selectedNode.id, selectedNode.name);
            return;
          }
        }
      } else if (path.startsWith('/note/')) {
        // Note page
        if (matchShortcut(e, shortcuts.global?.backToMap)) {
          e.preventDefault();
          navigate('/');
          return;
        }

        // Note page doesn't need selectedNode for Ctrl+N - it creates child of current note's node
        if (matchShortcut(e, shortcuts.node?.newNode)) {
          e.preventDefault();
          // Note page: Ctrl+N creates new node as child of the current note's node
          // The current note's node id is in the URL params
          onNewNode?.();
          return;
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedNode, shortcuts, location.pathname, navigate, onNewNode, onRenameNode, onDeleteNode, onOpenSearch, onBackToMap]);
}

export default useShortcuts;