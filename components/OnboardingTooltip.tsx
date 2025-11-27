import React, { useEffect, useRef, useState } from 'react';
import { X, ChevronRight, HelpCircle } from 'lucide-react';
import { OnboardingStep } from './OnboardingContext';

interface OnboardingTooltipProps {
  step: OnboardingStep;
  isVisible: boolean;
  onComplete: () => void;
  onDismiss: () => void;
  onNext?: () => void;
  hasNext?: boolean;
}

export const OnboardingTooltip: React.FC<OnboardingTooltipProps> = ({
  step,
  isVisible,
  onComplete,
  onDismiss,
  onNext,
  hasNext = false,
}) => {
  const [position, setPosition] = useState<{ top: number; left: number; arrow: string } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isVisible || !step.target) return;

    const updatePosition = () => {
      const targetElement = document.querySelector(step.target!) as HTMLElement;
      if (!targetElement || !tooltipRef.current) return;

      targetRef.current = targetElement;
      const targetRect = targetElement.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const position = step.position || 'bottom';
      const spacing = 12;

      let top = 0;
      let left = 0;
      let arrow = '';

      switch (position) {
        case 'top':
          top = targetRect.top - tooltipRect.height - spacing;
          left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
          arrow = 'bottom';
          break;
        case 'bottom':
          top = targetRect.bottom + spacing;
          left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
          arrow = 'top';
          break;
        case 'left':
          top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
          left = targetRect.left - tooltipRect.width - spacing;
          arrow = 'right';
          break;
        case 'right':
          top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
          left = targetRect.right + spacing;
          arrow = 'left';
          break;
      }

      // Корректировка позиции чтобы не выходить за границы экрана
      const padding = 16;
      if (left < padding) left = padding;
      if (left + tooltipRect.width > window.innerWidth - padding) {
        left = window.innerWidth - tooltipRect.width - padding;
      }
      if (top < padding) top = padding;
      if (top + tooltipRect.height > window.innerHeight - padding) {
        top = window.innerHeight - tooltipRect.height - padding;
      }

      setPosition({ top, left, arrow });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    // Небольшая задержка для правильного расчета размеров
    const timeout = setTimeout(updatePosition, 100);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isVisible, step.target, step.position]);

  if (!isVisible || !position) return null;

  return (
    <>
      {/* Overlay для затемнения фона */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9998]"
        onClick={onDismiss}
      />
      
      {/* Highlight для целевого элемента */}
      {targetRef.current && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            top: targetRef.current.getBoundingClientRect().top - 4,
            left: targetRef.current.getBoundingClientRect().left - 4,
            width: targetRef.current.getBoundingClientRect().width + 8,
            height: targetRef.current.getBoundingClientRect().height + 8,
            border: '2px solid rgba(99, 102, 241, 0.8)',
            borderRadius: '12px',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="fixed z-[10000] w-80 bg-gradient-to-br from-black/95 via-black/90 to-indigo-950/30 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-5 animate-in fade-in slide-in-from-bottom-2 duration-300"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        {/* Arrow */}
        <div
          className={`absolute w-0 h-0 border-8 ${
            position.arrow === 'top'
              ? 'top-0 -translate-y-full border-t-transparent border-l-transparent border-r-transparent border-b-indigo-500/30'
              : position.arrow === 'bottom'
              ? 'bottom-0 translate-y-full border-b-transparent border-l-transparent border-r-transparent border-t-indigo-500/30'
              : position.arrow === 'left'
              ? 'left-0 -translate-x-full border-l-transparent border-t-transparent border-b-transparent border-r-indigo-500/30'
              : 'right-0 translate-x-full border-r-transparent border-t-transparent border-b-transparent border-l-indigo-500/30'
          }`}
          style={{
            [position.arrow === 'top' || position.arrow === 'bottom' ? 'left' : 'top']: '50%',
            transform: `${
              position.arrow === 'top'
                ? 'translate(-50%, -100%)'
                : position.arrow === 'bottom'
                ? 'translate(-50%, 100%)'
                : position.arrow === 'left'
                ? 'translate(-100%, -50%)'
                : 'translate(100%, -50%)'
            }`,
          }}
        />

        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 border border-indigo-400/30">
              <HelpCircle size={16} className="text-indigo-300" />
            </div>
            {step.content.title && (
              <h3 className="font-bold text-white text-sm">{step.content.title}</h3>
            )}
          </div>
          <button
            onClick={onDismiss}
            className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            title="Закрыть"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <p className="text-white/70 text-sm leading-relaxed mb-4">
          {step.content.description}
        </p>

        {/* Examples */}
        {step.content.examples && step.content.examples.length > 0 && (
          <div className="mb-4 space-y-1.5">
            {step.content.examples.map((example, index) => (
              <div
                key={index}
                className="text-xs text-white/50 bg-white/5 border border-white/10 rounded-lg px-3 py-2"
              >
                {example}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
          <button
            onClick={onDismiss}
            className="text-xs text-white/50 hover:text-white/70 transition-colors"
          >
            Пропустить
          </button>
          <div className="flex items-center gap-2">
            {hasNext && onNext && (
              <button
                onClick={onNext}
                className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
              >
                Далее
                <ChevronRight size={14} />
              </button>
            )}
            <button
              onClick={onComplete}
              className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Понятно
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
