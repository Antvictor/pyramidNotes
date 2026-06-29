import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const GAP = 12;

function calcPosition(targetRect, tooltipWidth, tooltipHeight) {
  if (!targetRect) return null;

  const viewW = window.innerWidth;
  const viewH = window.innerHeight;
  const bottom = targetRect.bottom ?? (targetRect.top + targetRect.height);

  let left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
  let top = bottom + GAP;
  let arrow = 'top';

  if (left < 16) left = 16;
  if (left + tooltipWidth > viewW - 16) left = viewW - tooltipWidth - 16;

  if (top + tooltipHeight > viewH - 16) {
    top = targetRect.top - tooltipHeight - GAP;
    arrow = 'bottom';
  }

  return { left, top, arrow };
}

export default function BubbleTooltip({ step, phase, targetRect, onNext, onSkip }) {
  const { t } = useTranslation();
  const tooltipRef = useRef(null);
  const [position, setPosition] = useState(null);

  const substep = (step?.subSteps && step._currentSubstep >= 0)
    ? step.subSteps[step._currentSubstep]
    : null;

  const contentKey = substep
    ? (phase === 'user-action' && substep.bubbleAfterActionKey
        ? substep.bubbleAfterActionKey
        : substep.bubbleContentKey)
    : (phase === 'user-action' && step?.bubbleAfterActionKey
        ? step?.bubbleAfterActionKey
        : step?.bubbleContentKey);
  const content = contentKey ? t(contentKey) : t("tutorial.loading");

  const buttons = substep?.buttons || step?.buttons || ['skip'];
  const showNext = phase !== 'user-action';

  useEffect(() => {
    if (tooltipRef.current && targetRect) {
      const w = tooltipRef.current.offsetWidth;
      const h = tooltipRef.current.offsetHeight;
      setPosition(calcPosition(targetRect, w, h));
    }
  }, [targetRect, content]);

  if (!step) return null;

  return (
    <div
      ref={tooltipRef}
      className={`bubble-tooltip arrow-${position?.arrow || 'top'}`}
      style={{
        position: 'fixed',
        left: position?.left ?? '50%',
        top: position?.top ?? '50%',
        opacity: position ? 1 : 0,
        background: 'var(--bg-primary)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '16px 24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        zIndex: 10002,
        minWidth: 280,
        maxWidth: 400,
        pointerEvents: position && phase !== 'user-action' ? 'all' : 'none',
        transition: 'top 0.15s ease, left 0.15s ease',
      }}
    >
      <div style={{ marginBottom: 16, fontSize: 14, lineHeight: 1.6 }}>
        {content}
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        {buttons.includes('skip') && (
          <Button variant="outline" onClick={onSkip}>
            {t("common.skip")}
          </Button>
        )}
        {showNext && buttons.includes('next') && (
          <Button onClick={onNext}>
            {t("common.next")}
          </Button>
        )}
      </div>
    </div>
  );
}
