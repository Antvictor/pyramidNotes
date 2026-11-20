import { useEffect, useRef } from 'react';

// 分类即作用域：页面只注册动作处理器，是否触发由绑定所在分类决定。
// 未登记的分类不激活（显式登记优先于默认放开）。
export const CATEGORY_SCOPES = {
  global: 'all',
  node: 'mindmap',
  note: 'note',
};

export function isCategoryActive(category, scope) {
  const target = CATEGORY_SCOPES[category];
  if (!target) return false;
  return target === 'all' || target === scope;
}

function keyNameOf(eventKey) {
  return eventKey === ' ' ? 'Space' : eventKey;
}

export function matchShortcut(e, shortcutStr) {
  if (!shortcutStr) return false;

  const parts = shortcutStr.split('+');
  const modifiers = parts.slice(0, -1).map((part) => part.trim());
  const key = parts[parts.length - 1].trim();

  const isMod = e.ctrlKey || e.metaKey;
  const modStateMatch =
    modifiers.includes('Ctrl') === Boolean(isMod) &&
    modifiers.includes('Shift') === Boolean(e.shiftKey) &&
    modifiers.includes('Alt') === Boolean(e.altKey);

  if (!modStateMatch) return false;

  return keyNameOf(e.key).toLowerCase() === key.toLowerCase();
}

export function isEditableTarget(target) {
  const el = target?.nodeType === 1 ? target : target?.parentElement;
  if (!el?.closest) return false;
  return Boolean(el.closest(
    'input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]',
  ));
}

function hasOpenDialog() {
  if (typeof document === 'undefined') return false;
  return Boolean(document.querySelector('[data-slot="dialog-content"][data-state="open"]'));
}

// blocked：页面自定义浮层（右键菜单、旧弹窗等）打开时为 true。
// 非 global 分类在可编辑目标或弹窗打开时不触发；global 分类保持现有行为
// （编辑器内仍可用 Ctrl+K 打开/切换搜索）。
export function useShortcutActions({ shortcuts, scope, handlers, blocked = false }) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const blockedRef = useRef(blocked);
  blockedRef.current = blocked;

  useEffect(() => {
    if (!shortcuts) return undefined;

    const onKeyDown = (event) => {
      if (event.repeat) return;

      const editable = isEditableTarget(event.target);
      const overlayOpen = blockedRef.current || hasOpenDialog();

      for (const [category, bindings] of Object.entries(shortcuts)) {
        if (!isCategoryActive(category, scope)) continue;
        const isGlobal = category === 'global';
        if (!isGlobal && (editable || overlayOpen)) continue;

        for (const [actionId, binding] of Object.entries(bindings || {})) {
          if (!binding) continue;
          if (!matchShortcut(event, binding)) continue;

          const handler = handlersRef.current?.[actionId];
          if (!handler) continue;

          handler(event);
          return;
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [shortcuts, scope]);
}

export default useShortcutActions;
