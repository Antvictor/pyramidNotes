import { useState, useEffect, useRef } from "react";
import SelectionRing from "./SelectionRing";
import BubbleTooltip from "./BubbleTooltip";
import { TUTORIAL_STEPS, APP_VERSION } from "./TUTORIAL_STEPS";
import { executeAutoAction } from "./AutoActionExecutor";
import { Detector } from "./Detector";

export default function TutorialController({ children }) {
  const [state, setState] = useState({
    isActive: false,
    currentStepIndex: 0,
    phase: 'idle'  // 'idle' | 'auto' | 'user-action'
  });

  const currentStep = TUTORIAL_STEPS[state.currentStepIndex];
  const tutorialRef = useRef(null);

  // 初始化：检查是否需要显示教程
  useEffect(() => {
    const initTutorial = async () => {
      const settings = await window.api.getSettings();
      if (!settings.tutorialVersion || settings.tutorialVersion < APP_VERSION) {
        setState(s => ({ ...s, isActive: true }));
      }
    };
    initTutorial();
  }, []);

  // 监听用户操作完成
  useEffect(() => {
    if (state.phase !== 'user-action' || !currentStep?.requiredAction) return;

    const eventType = currentStep.requiredAction.detectEvent;
    const unsubscribe = Detector.createListener(eventType, (type, data) => {
      // 检测到用户操作完成
      advanceToNextStep();
    });

    return () => unsubscribe();
  }, [state.phase, currentStep]);

  // 注册 window.tutorial 接口
  useEffect(() => {
    window.tutorial = {
      notifyEvent: (eventType, data) => {
        // 处理事件通知
      },
      getState: () => state,
      forceCompleteStep: () => advanceToNextStep()
    };

    return () => {
      delete window.tutorial;
    };
  }, [state]);

  const handleNext = async () => {
    if (!currentStep) return;

    if (currentStep.autoAction) {
      setState(s => ({ ...s, phase: 'auto' }));
      await executeAutoAction(currentStep.autoAction);

      if (currentStep.requiredAction) {
        setState(s => ({ ...s, phase: 'user-action' }));
      } else {
        advanceToNextStep();
      }
    } else {
      setState(s => ({ ...s, phase: 'user-action' }));
    }
  };

  const handleSkip = async () => {
    await completeTutorial();
  };

  const advanceToNextStep = () => {
    const nextIndex = state.currentStepIndex + 1;
    if (nextIndex >= TUTORIAL_STEPS.length) {
      completeTutorial();
    } else {
      setState(s => ({
        ...s,
        currentStepIndex: nextIndex,
        phase: 'idle'
      }));
    }
  };

  const completeTutorial = async () => {
    await window.api.saveSettings({ tutorialVersion: APP_VERSION });
    setState(s => ({ ...s, isActive: false, phase: 'idle' }));
  };

  if (!state.isActive) return children;

  return (
    <>
      {children}
      <SelectionRing target={currentStep?.target} />
      <BubbleTooltip
        step={currentStep}
        phase={state.phase}
        onNext={handleNext}
        onSkip={handleSkip}
      />
    </>
  );
}