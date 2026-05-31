import { useState, useEffect, useRef } from "react";

export default function SelectionRing({ target, stepId }) {
  const [position, setPosition] = useState(null);
  const targetRef = useRef(null);

  useEffect(() => {
    if (!target) return;

    let element;
    switch (target.type) {
      case 'pane':
        element = document.querySelector('.react-flow__pane');
        break;
      case 'node':
        element = document.querySelector('.react-flow__node');
        break;
      case 'dialog':
        element = document.querySelector('[data-slot="dialog-content"]');
        break;
      case 'editor':
        element = document.querySelector('.ProseMirror');
        break;
      case 'sidebar-settings':
        element = document.querySelector('a[href="/settings"]');
        break;
      case 'change-dir-button':
        element = Array.from(document.querySelectorAll('button')).find(
          btn => btn.textContent.includes('Change')
        );
        break;
      case 'shortcuts-button':
        element = Array.from(document.querySelectorAll('button')).find(
          btn => btn.textContent.includes('配置')
        );
        break;
      case 'keyboard':
        // 不需要定位
        setPosition(null);
        return;
      default:
        element = null;
    }

    if (element) {
      const rect = element.getBoundingClientRect();
      setPosition(rect);
    } else {
      setPosition(null);
    }
  }, [target]);

  if (!position) return null;

  return (
    <div
      className="selection-ring"
      data-step-id={stepId}
      style={{
        position: 'fixed',
        left: position.left - 8,
        top: position.top - 8,
        width: position.width + 16,
        height: position.height + 16,
        border: '2px dashed var(--link-color)',
        borderRadius: 8,
        animation: 'pulse 2s infinite',
        pointerEvents: 'none',
        zIndex: 9998,
      }}
    />
  );
}