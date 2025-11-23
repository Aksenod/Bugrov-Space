import React from 'react';

export const MessageSkeleton: React.FC = React.memo(() => {
  return (
    <div className="flex w-full mb-6 justify-start group animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex-shrink-0 mr-3 mt-1">
        <div className="w-8 h-8 rounded-full bg-neutral-700/50 animate-pulse" />
      </div>
      <div className="relative max-w-[88%] md:max-w-[75%] px-5 py-4 bg-neutral-800/50 rounded-[1.5rem] rounded-tl-sm border border-white/10">
        <div className="space-y-2">
          <div className="h-4 bg-neutral-700/50 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-neutral-700/50 rounded animate-pulse w-5/6" />
          <div className="h-4 bg-neutral-700/50 rounded animate-pulse w-2/3" />
        </div>
        <div className="mt-2 h-3 bg-neutral-700/30 rounded w-16 animate-pulse" />
      </div>
    </div>
  );
});

