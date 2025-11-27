import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, Sparkles, Briefcase, Bot, FileText, MessageSquare } from 'lucide-react';
import { OnboardingStep } from './OnboardingContext';

interface OnboardingModalProps {
  steps: OnboardingStep[];
  isVisible: boolean;
  onComplete: (stepId: string) => void;
  onDismiss: () => void;
  startStep?: number;
}

const getIcon = (stepId: string) => {
  if (stepId.includes('project') || stepId.includes('проект')) {
    return <Briefcase size={32} className="text-indigo-400" />;
  }
  if (stepId.includes('agent') || stepId.includes('агент')) {
    return <Bot size={32} className="text-emerald-400" />;
  }
  if (stepId.includes('document') || stepId.includes('документ')) {
    return <FileText size={32} className="text-amber-400" />;
  }
  if (stepId.includes('chat') || stepId.includes('чат')) {
    return <MessageSquare size={32} className="text-purple-400" />;
  }
  return <Sparkles size={32} className="text-indigo-400" />;
};

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  steps,
  isVisible,
  onComplete,
  onDismiss,
  startStep = 0,
}) => {
  const [currentIndex, setCurrentIndex] = useState(startStep);

  if (!isVisible || steps.length === 0) return null;

  const currentStep = steps[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      // Завершаем все шаги
      steps.forEach(step => onComplete(step.id));
      onDismiss();
    } else {
      onComplete(currentStep.id);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirst) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    steps.forEach(step => onComplete(step.id));
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onDismiss}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-gradient-to-br from-black/95 via-black/90 to-indigo-950/30 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-400/30">
                {getIcon(currentStep.id)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {currentStep.content.title || 'Добро пожаловать!'}
                </h2>
                <p className="text-xs text-white/50 mt-1">
                  Шаг {currentIndex + 1} из {steps.length}
                </p>
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-white/80 text-base leading-relaxed mb-4">
            {currentStep.content.description}
          </p>

          {/* Examples */}
          {currentStep.content.examples && currentStep.content.examples.length > 0 && (
            <div className="space-y-2 mb-4">
              {currentStep.content.examples.map((example, index) => (
                <div
                  key={index}
                  className="p-3 bg-white/5 border border-white/10 rounded-lg text-sm text-white/60"
                >
                  {example}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-sm text-white/50 hover:text-white/70 transition-colors"
          >
            Пропустить тур
          </button>
          <div className="flex items-center gap-3">
            {!isFirst && (
              <button
                onClick={handlePrevious}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
              >
                <ChevronLeft size={16} />
                Назад
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              {isLast ? 'Начать работу' : 'Далее'}
              {!isLast && <ChevronRight size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
