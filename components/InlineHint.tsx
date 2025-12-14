import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, X, MessageCircle } from 'lucide-react';

interface InlineHintProps {
  title?: string;
  description: string;
  examples?: string[];
  variant?: 'info' | 'tip' | 'warning';
  collapsible?: boolean;
  defaultExpanded?: boolean;
  onDismiss?: () => void;
  dismissible?: boolean;
  onExampleClick?: (example: string) => void;
}

export const InlineHint: React.FC<InlineHintProps> = ({
  title,
  description,
  examples,
  variant = 'info',
  collapsible = false,
  defaultExpanded = true,
  onDismiss,
  dismissible = false,
  onExampleClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const variantStyles = {
    info: {
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/30',
      text: 'text-indigo-300',
      icon: 'text-indigo-400',
    },
    tip: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-300',
      icon: 'text-emerald-400',
    },
    warning: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-300',
      icon: 'text-amber-400',
    },
  };

  const styles = variantStyles[variant];

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <div
      className={`${styles.bg} ${styles.border} border rounded-xl p-4 mb-4 animate-in fade-in slide-in-from-top-2 duration-300`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className={`p-1.5 rounded-lg ${styles.bg} ${styles.icon}`}>
            <HelpCircle size={18} />
          </div>
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className={`${styles.text} font-semibold text-sm mb-1.5`}>
                {title}
              </h3>
            )}
            {(!collapsible || isExpanded) && (
              <>
                <p className="text-white/70 text-sm leading-relaxed mb-2">
                  {description}
                </p>
                {examples && examples.length > 0 && (
                  <div className="space-y-1.5 mt-3">
                    {examples.map((example, index) => (
                      onExampleClick ? (
                        <button
                          key={index}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (import.meta.env.DEV) {
                            }
                            onExampleClick(example);
                          }}
                          className="w-full text-left text-xs text-white/90 bg-gradient-to-r from-indigo-500/20 via-indigo-500/15 to-blue-500/20 border border-indigo-500/30 rounded-lg px-3 py-2.5 hover:from-indigo-500/30 hover:via-indigo-500/25 hover:to-blue-500/30 hover:border-indigo-400/50 hover:text-white hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black transition-all cursor-pointer flex items-center gap-2 group"
                        >
                          <MessageCircle size={14} className="text-indigo-300 group-hover:text-indigo-200 flex-shrink-0 transition-colors" />
                          <span className="flex-1">{example}</span>
                        </button>
                      ) : (
                        <div
                          key={index}
                          className="text-xs text-white/50 bg-white/5 border border-white/10 rounded-lg px-3 py-2"
                        >
                          {example}
                        </div>
                      )
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {collapsible && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
          {dismissible && (
            <button
              onClick={handleDismiss}
              className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
