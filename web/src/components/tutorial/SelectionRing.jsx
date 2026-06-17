import { useState, useEffect, useRef } from "react";

function resolveElement(target) {
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
      return document.querySelector('a[href="/settings"]');
    case 'change-dir-button':
      return Array.from(document.querySelectorAll('button')).find(
        btn => btn.textContent.includes('Change')
      );
    case 'shortcuts-button':
      return Array.from(document.querySelectorAll('button')).find(
        btn => btn.textContent.includes('配置')
      );
    case 'menu-item':
      return document.querySelector(`[data-menu-item="${target.value}"]`);
    case 'keyboard':
      return null;
    default:
      return null;
  }
}

export default function SelectionRing({ target }) {
  const [rect, setRect] = useState(null);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!target) { setRect(null); return; }

    const updateRect = () => {
      const el = resolveElement(target);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({ left: r.left, top: r.top, width: r.width, height: r.height });
      } else {
        setRect(null);
      }
    };

    updateRect();

    const onUpdate = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateRect);
    };

    window.addEventListener('resize', onUpdate);
    window.addEventListener('scroll', onUpdate, true);

    return () => {
      window.removeEventListener('resize', onUpdate);
      window.removeEventListener('scroll', onUpdate, true);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target]);

  // 每 200ms 重试查找目标（处理 React 异步渲染）
  useEffect(() => {
    if (rect || !target) return;
    const timer = setInterval(() => {
      const el = resolveElement(target);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({ left: r.left, top: r.top, width: r.width, height: r.height });
        clearInterval(timer);
      }
    }, 200);
    return () => clearInterval(timer);
  }, [target, rect]);

  if (!rect) return null;

  return (
    <div
      className="selection-ring"
      style={{
        position: 'fixed',
        left: rect.left - 8,
        top: rect.top - 8,
        width: rect.width + 16,
        height: rect.height + 16,
        border: '2px dashed var(--link-color)',
        borderRadius: 8,
        animation: 'pulse 2s infinite',
        pointerEvents: 'none',
        zIndex: 10001,
      }}
    />
  );
}
