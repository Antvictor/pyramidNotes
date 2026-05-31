import { Button } from "@/components/ui/button";

export default function BubbleTooltip({ step, phase, onNext, onSkip }) {
  if (!step) return null;

  const content = phase === 'user-action'
    ? step.bubbleAfterAction
    : step.bubbleContent;

  const buttons = step.buttons || ['skip'];

  return (
    <div
      className="bubble-tooltip"
      style={{
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'var(--bg-primary)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '16px 24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        zIndex: 10001,
        minWidth: 280,
        maxWidth: 400,
        pointerEvents: 'all',
      }}
    >
      <div style={{ marginBottom: 16 }}>
        {content}
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        {buttons.includes('skip') && (
          <Button variant="outline" onClick={onSkip}>
            跳过
          </Button>
        )}
        {buttons.includes('next') && (
          <Button onClick={onNext}>
            下一步
          </Button>
        )}
      </div>
    </div>
  );
}