import React from 'react';

/**
 * Компонент анимации печатания (три точки) для скелетона
 */
const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '0ms', animationDuration: '1.4s' }} />
      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '200ms', animationDuration: '1.4s' }} />
      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '400ms', animationDuration: '1.4s' }} />
    </div>
  );
};

export const MessageSkeleton: React.FC = React.memo(() => {
  return (
    <div className="flex w-full mb-6 justify-start group animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex-shrink-0 mr-3 mt-1">
        <div className="w-8 h-8 rounded-full bg-neutral-700/50 animate-pulse shadow-indigo-500/30" />
      </div>
      <div className="relative max-w-[88%] md:max-w-[75%] px-5 py-4 bg-neutral-800/50 rounded-[1.5rem] rounded-tl-sm border border-white/10 border-indigo-500/20">
        <TypingIndicator />
      </div>
    </div>
  );
});

