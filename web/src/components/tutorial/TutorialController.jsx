import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import SelectionRing from "./SelectionRing";
import BubbleTooltip from "./BubbleTooltip";
import { TUTORIAL_STEPS, APP_VERSION } from "./TUTORIAL_STEPS";
import { executeAutoAction } from "./AutoActionExecutor";
import { Detector } from "./Detector";
import "./tutorial.css";
import { useTranslation } from "react-i18next";
import { findTutorialTarget } from "./targetResolver";

const MASK_Z = 9989;
const ELEVATED_Z = 9990;

// 解析步骤或子步骤的 target
function resolveTarget(step, substepIndex) {
  if (step?.subSteps && substepIndex >= 0 && step.subSteps[substepIndex]) {
    return step.subSteps[substepIndex].target;
  }
  return step?.target;
}

export default function TutorialController({ children }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [state, setState] = useState({
    isActive: false,
    stepIndex: 0,
    substepIndex: -1,
    phase: 'idle',
    targetRect: null,
    loadingTimeout: false,
  });

  const step = TUTORIAL_STEPS[state.stepIndex];
  const elevatedRef = useRef([]);
  const userActionUnsubRef = useRef(null);
  const observerRef = useRef(null);

  // ========== 初始化 ==========
  useEffect(() => {
    const init = async () => {
      const settings = await window.api.getSettings();
      if (!settings.tutorialVersion || settings.tutorialVersion < APP_VERSION) {
        setState(s => ({ ...s, isActive: true }));
      }
    };
    init();
  }, []);

  // ========== 教程激活时提升 Dialog 层级 ==========
  useEffect(() => {
    if (state.isActive) {
      document.body.classList.add('tutorial-active');
      return () => document.body.classList.remove('tutorial-active');
    }
  }, [state.isActive]);

  // ========== 步骤切换时更新 targetRect ==========
  useEffect(() => {
    if (!state.isActive) return;

    const target = resolveTarget(step, state.substepIndex);

    let active = true;
    let pollTimer;

    const updateRect = () => {
      if (!active) return;
      const el = findTutorialTarget(target);
      if (el) {
        const r = el.getBoundingClientRect();
        setState(s => ({ ...s, targetRect: { left: r.left, top: r.top, width: r.width, height: r.height, bottom: r.bottom, right: r.right } }));
        return true;
      }
      return false;
    };

    if (!updateRect()) {
      pollTimer = setInterval(() => {
        if (updateRect()) clearInterval(pollTimer);
      }, 200);
    }

    const onResize = () => {
      const currentTarget = resolveTarget(TUTORIAL_STEPS[state.stepIndex], state.substepIndex);
      const currentEl = findTutorialTarget(currentTarget);
      if (currentEl) {
        const r = currentEl.getBoundingClientRect();
        setState(s => ({ ...s, targetRect: { left: r.left, top: r.top, width: r.width, height: r.height, bottom: r.bottom, right: r.right } }));
      }
    };
    window.addEventListener('resize', onResize);
    return () => {
      active = false;
      clearInterval(pollTimer);
      window.removeEventListener('resize', onResize);
    };
  }, [state.isActive, state.stepIndex, state.substepIndex]);

  // ========== z-index 管理 ==========
  const elevateTarget = useCallback((el) => {
    if (!el) return;
    const origPosition = el.style.position || getComputedStyle(el).position;
    const origZIndex = el.style.zIndex || getComputedStyle(el).zIndex;

    if (origPosition === 'static') {
      el.style.position = 'relative';
    }
    el.style.zIndex = String(ELEVATED_Z);

    elevatedRef.current.push({ el, origPosition, origZIndex });
  }, []);

  const restoreTarget = useCallback((el) => {
    const record = elevatedRef.current.find(r => r.el === el);
    if (!record) return;
    el.style.position = record.origPosition === 'static' ? '' : record.origPosition;
    el.style.zIndex = record.origZIndex === 'auto' ? '' : record.origZIndex;
    elevatedRef.current = elevatedRef.current.filter(r => r.el !== el);
  }, []);

  const restoreAll = useCallback(() => {
    elevatedRef.current.forEach(({ el, origPosition, origZIndex }) => {
      el.style.position = origPosition === 'static' ? '' : origPosition;
      el.style.zIndex = origZIndex === 'auto' ? '' : origZIndex;
    });
    elevatedRef.current = [];
  }, []);

  // ========== MutationObserver 兜底 ==========
  useEffect(() => {
    if (!state.isActive) return;

    const target = resolveTarget(step, state.substepIndex);
    const el = findTutorialTarget(target);
    if (!el) return;

    // 提升当前已存在的目标元素
    if (!elevatedRef.current.find(r => r.el === el)) {
      elevateTarget(el);
    }

    const parent = el.parentElement;
    if (!parent) return;

    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new MutationObserver(() => {
      const currentEl = findTutorialTarget(target);
      if (currentEl && currentEl !== el && !elevatedRef.current.find(r => r.el === currentEl)) {
        elevateTarget(currentEl);
      }
    });

    observerRef.current.observe(parent, { childList: true });
    return () => observerRef.current?.disconnect();
  }, [state.isActive, state.stepIndex, state.substepIndex]);

  // ========== user-action 检测 ==========
  useEffect(() => {
    if (state.phase !== 'user-action') {
      if (userActionUnsubRef.current && typeof userActionUnsubRef.current === 'function') {
        userActionUnsubRef.current();
      }
      userActionUnsubRef.current = null;
      return;
    }

    const currentStep = TUTORIAL_STEPS[state.stepIndex];
    let eventType;
    let sub;

    if (currentStep?.subSteps && state.substepIndex >= 0) {
      sub = currentStep.subSteps[state.substepIndex];
      eventType = sub?.requiredAction?.detectEvent;
    } else {
      eventType = currentStep?.requiredAction?.detectEvent;
    }

    if (!eventType) return;

    // dialogClosed 步骤：如果没有弹窗打开，说明上一步被跳过了，自动推进
    if (eventType === 'dialogClosed' && !document.querySelector('[data-slot="dialog-content"]')) {
      advanceStep();
      return;
    }

    // 所有 user-action 步骤：放行 spotlight，让用户能点击页面元素
    const spotlight = document.querySelector('.tutorial-spotlight');
    if (spotlight) spotlight.style.pointerEvents = 'none';

    // 菜单相关步骤：确保菜单打开，禁用 mask 防误关
    if (['requestCreateNode', 'requestEditNode', 'requestDeleteNode'].includes(eventType)) {
      const menu = document.querySelector('.context-menu');
      if (!menu) {
        const nodeEl = document.querySelector('.react-flow__node');
        if (nodeEl) {
          const rect = nodeEl.getBoundingClientRect();
          nodeEl.dispatchEvent(new MouseEvent('contextmenu', {
            clientX: rect.left + rect.width / 2,
            clientY: rect.top + rect.height / 2,
            button: 2, buttons: 2, bubbles: true, cancelable: true, view: window
          }));
        }
      } else {
        const mask = document.querySelector('.context-menu-mask');
        if (mask) mask.style.pointerEvents = 'none';
      }
    }

    userActionUnsubRef.current = Detector.createListener(eventType, () => {
      advanceStep();
    });

    return () => {
      if (userActionUnsubRef.current && typeof userActionUnsubRef.current === 'function') {
        userActionUnsubRef.current();
        userActionUnsubRef.current = null;
      }
      if (spotlight) spotlight.style.pointerEvents = '';
      const mask = document.querySelector('.context-menu-mask');
      if (mask) mask.style.pointerEvents = '';
    };
  }, [state.phase, state.stepIndex, state.substepIndex]);

  // ========== 步骤推进 ==========
  const advanceStep = useCallback(() => {
    const currentTargetEl = findTutorialTarget(resolveTarget(step, state.substepIndex));
    if (currentTargetEl) restoreTarget(currentTargetEl);

    if (userActionUnsubRef.current) {
      userActionUnsubRef.current();
      userActionUnsubRef.current = null;
    }

    const currentStep = TUTORIAL_STEPS[state.stepIndex];

    // 有子步骤：先推进子步骤
    if (currentStep?.subSteps && state.substepIndex < currentStep.subSteps.length - 1) {
      const nextSubstepIndex = state.substepIndex + 1;
      const nextSub = currentStep.subSteps[nextSubstepIndex];
      const nextPhase = nextSub?.requiredAction ? 'user-action' : 'idle';
      setState(s => ({ ...s, substepIndex: nextSubstepIndex, phase: nextPhase }));
      return;
    }

    // 推进 step
    const nextIndex = state.stepIndex + 1;
    if (nextIndex >= TUTORIAL_STEPS.length) {
      completeTutorial();
    } else {
      const nextStep = TUTORIAL_STEPS[nextIndex];
      const nextPhase = nextStep.requiredAction ? 'user-action' : 'idle';
      setState(s => ({
        ...s,
        stepIndex: nextIndex,
        substepIndex: -1,
        phase: nextPhase,
      }));
    }
  }, [state.stepIndex, state.substepIndex, step, restoreTarget]);

  // ========== 等待 DOM ==========
  const waitForDOM = useCallback((target, maxWait = 2000) => {
    return new Promise((resolve) => {
      const el = findTutorialTarget(target);
      if (el) { resolve(el); return; }

      const startTime = Date.now();
      const timer = setInterval(() => {
        const el = findTutorialTarget(target);
        if (el) {
          clearInterval(timer);
          resolve(el);
        } else if (Date.now() - startTime > maxWait) {
          clearInterval(timer);
          resolve(null);
        }
      }, 100);
    });
  }, []);

  // ========== 处理下一步 ==========
  const handleNext = useCallback(async () => {
    const currentStep = TUTORIAL_STEPS[state.stepIndex];
    if (!currentStep) return;

    // 如果当前在子步骤，推进到下一个子步骤
    if (currentStep.subSteps && state.substepIndex >= 0) {
      advanceStep();
      return;
    }

    setState(s => ({ ...s, phase: 'auto' }));

    if (currentStep.autoAction) {
      // 等待步骤目标元素存在后再执行 autoAction
      const stepTarget = currentStep.target;
      if (stepTarget) {
        const targetEl = await waitForDOM(stepTarget);
        if (!targetEl) {
          setState(s => ({ ...s, loadingTimeout: true }));
          return;
        }
        // 提升目标元素 z-index
        elevateTarget(targetEl);
      }
      await executeAutoAction(currentStep.autoAction, currentStep.target, navigate);
    }

    if (currentStep.subSteps) {
      setState(s => ({ ...s, phase: 'waiting-dom' }));
      const firstSubTarget = currentStep.subSteps[0].target;
      const el = await waitForDOM(firstSubTarget);
      if (!el) {
        setState(s => ({ ...s, loadingTimeout: true }));
        return;
      }

      setState(s => ({ ...s, substepIndex: 0, phase: currentStep.subSteps[0]?.requiredAction ? 'user-action' : 'idle', loadingTimeout: false }));
      return;
    }

    if (currentStep.requiredAction) {
      setState(s => ({ ...s, phase: 'user-action' }));
    } else {
      advanceStep();
    }
  }, [state.stepIndex, navigate, waitForDOM, elevateTarget, advanceStep]);

  // ========== 处理跳过 ==========
  const handleSkip = useCallback(async () => {
    const currentTargetEl = findTutorialTarget(resolveTarget(step, state.substepIndex));
    if (currentTargetEl) restoreTarget(currentTargetEl);

    // 关闭可能残留的右键菜单
    const menuMask = document.querySelector('.context-menu-mask');
    if (menuMask) menuMask.click();

    const nextIndex = state.stepIndex + 1;
    if (nextIndex >= TUTORIAL_STEPS.length) {
      completeTutorial();
    } else {
      const nextStep = TUTORIAL_STEPS[nextIndex];
      const nextPhase = nextStep.requiredAction ? 'user-action' : 'idle';
      setState(s => ({
        ...s,
        stepIndex: nextIndex,
        substepIndex: -1,
        phase: nextPhase,
      }));
    }
  }, [state.stepIndex, state.substepIndex, step, restoreTarget]);

  // ========== 完成教程 ==========
  const completeTutorial = useCallback(async () => {
    restoreAll();
    await window.api.saveSettings({ tutorialVersion: APP_VERSION });
    setState(s => ({ ...s, isActive: false, phase: 'idle' }));
  }, [restoreAll]);

  // ========== 渲染 ==========
  if (!state.isActive) return children;

  const currentTarget = resolveTarget(step, state.substepIndex);
  const enrichedStep = step?.subSteps
    ? { ...step, _currentSubstep: state.substepIndex }
    : step;

  return (
    <>
      {children}

      {/* 聚光灯蒙版 */}
      <div
        className="tutorial-spotlight"
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: MASK_Z,
          pointerEvents: 'all',
        }}
      />

      <SelectionRing target={currentTarget} />

      <BubbleTooltip
        step={enrichedStep}
        phase={state.phase === 'waiting-dom' ? 'idle' : state.phase}
        targetRect={state.targetRect}
        onNext={handleNext}
        onSkip={handleSkip}
      />

      {/* DOM 等待超时提示 */}
      {state.loadingTimeout && (
        <div
          style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10003, background: 'var(--bg-primary)',
            padding: 24, borderRadius: 12,
            border: '1px solid var(--border)',
            pointerEvents: 'all',
          }}
        >
          <p style={{ marginBottom: 16 }}>{t("tutorial.timeout")}</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button
              onClick={handleSkip}
              style={{
                padding: '8px 16px', borderRadius: 6,
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-primary)',
                cursor: 'pointer', fontSize: 14,
              }}
            >
              {t("common.skip")}
            </button>
            <button
              onClick={handleNext}
              style={{
                padding: '8px 16px', borderRadius: 6,
                border: 'none',
                background: 'var(--link-color)',
                color: 'white',
                cursor: 'pointer', fontSize: 14,
              }}
            >
              {t("common.retry")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
