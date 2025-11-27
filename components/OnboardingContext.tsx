import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ONBOARDING_STORAGE_KEY = 'bugrov-space-onboarding';
const ONBOARDING_VERSION = '1.0.0';

export interface OnboardingStep {
  id: string;
  component: 'tooltip' | 'modal' | 'inline';
  target?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  content: {
    title?: string;
    description: string;
    examples?: string[];
  };
  showOnce?: boolean;
  condition?: () => boolean;
  priority?: number; // для порядка показа
}

interface OnboardingState {
  completedSteps: Set<string>;
  dismissedSteps: Set<string>;
  currentStep: string | null;
  isOnboardingActive: boolean;
  version: string;
}

interface OnboardingContextType {
  completedSteps: Set<string>;
  dismissedSteps: Set<string>;
  currentStep: string | null;
  isOnboardingActive: boolean;
  completeStep: (stepId: string) => void;
  dismissStep: (stepId: string) => void;
  setCurrentStep: (stepId: string | null) => void;
  shouldShowStep: (step: OnboardingStep) => boolean;
  isStepCompleted: (stepId: string) => boolean;
  resetOnboarding: () => void;
  getStepProgress: () => { completed: number; total: number };
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
};

interface OnboardingProviderProps {
  children: React.ReactNode;
  steps: OnboardingStep[];
}

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children, steps }) => {
  const [state, setState] = useState<OnboardingState>(() => {
    // Загружаем состояние из localStorage
    try {
      const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Проверяем версию - если изменилась, сбрасываем
        if (parsed.version === ONBOARDING_VERSION) {
          return {
            completedSteps: new Set(parsed.completedSteps || []),
            dismissedSteps: new Set(parsed.dismissedSteps || []),
            currentStep: parsed.currentStep || null,
            isOnboardingActive: parsed.isOnboardingActive !== false,
            version: ONBOARDING_VERSION,
          };
        }
      }
    } catch (error) {
      console.warn('Failed to load onboarding state from localStorage', error);
    }
    
    // Дефолтное состояние для новых пользователей
    return {
      completedSteps: new Set<string>(),
      dismissedSteps: new Set<string>(),
      currentStep: null,
      isOnboardingActive: true,
      version: ONBOARDING_VERSION,
    };
  });

  // Сохраняем состояние в localStorage при изменении
  useEffect(() => {
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify({
        completedSteps: Array.from(state.completedSteps),
        dismissedSteps: Array.from(state.dismissedSteps),
        currentStep: state.currentStep,
        isOnboardingActive: state.isOnboardingActive,
        version: state.version,
      }));
    } catch (error) {
      console.warn('Failed to save onboarding state to localStorage', error);
    }
  }, [state]);

  const completeStep = useCallback((stepId: string) => {
    setState(prev => ({
      ...prev,
      completedSteps: new Set([...prev.completedSteps, stepId]),
      dismissedSteps: new Set([...Array.from(prev.dismissedSteps).filter(id => id !== stepId)]),
      currentStep: prev.currentStep === stepId ? null : prev.currentStep,
    }));
  }, []);

  const dismissStep = useCallback((stepId: string) => {
    setState(prev => ({
      ...prev,
      dismissedSteps: new Set([...prev.dismissedSteps, stepId]),
      currentStep: prev.currentStep === stepId ? null : prev.currentStep,
    }));
  }, []);

  const setCurrentStep = useCallback((stepId: string | null) => {
    setState(prev => ({
      ...prev,
      currentStep: stepId,
    }));
  }, []);

  const shouldShowStep = useCallback((step: OnboardingStep): boolean => {
    // Если онбординг отключен, не показываем
    if (!state.isOnboardingActive) return false;

    // Если шаг уже завершен и showOnce = true, не показываем
    if (step.showOnce && state.completedSteps.has(step.id)) {
      return false;
    }

    // Если шаг отклонен, не показываем
    if (state.dismissedSteps.has(step.id)) {
      return false;
    }

    // Проверяем условие показа
    if (step.condition && !step.condition()) {
      return false;
    }

    return true;
  }, [state]);

  const resetOnboarding = useCallback(() => {
    setState({
      completedSteps: new Set<string>(),
      dismissedSteps: new Set<string>(),
      currentStep: null,
      isOnboardingActive: true,
      version: ONBOARDING_VERSION,
    });
  }, []);

  const isStepCompleted = useCallback((stepId: string): boolean => {
    return state.completedSteps.has(stepId);
  }, [state.completedSteps]);

  const getStepProgress = useCallback(() => {
    const total = steps.length;
    const completed = steps.filter(step => state.completedSteps.has(step.id)).length;
    return { completed, total };
  }, [steps, state.completedSteps]);

  const value: OnboardingContextType = {
    completedSteps: state.completedSteps,
    dismissedSteps: state.dismissedSteps,
    currentStep: state.currentStep,
    isOnboardingActive: state.isOnboardingActive,
    completeStep,
    dismissStep,
    setCurrentStep,
    shouldShowStep,
    isStepCompleted,
    resetOnboarding,
    getStepProgress,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};
