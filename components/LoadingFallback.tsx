import React from 'react';
import { Bot, Loader2 } from 'lucide-react';

/**
 * Компонент загрузки для модальных окон
 * Используется в Suspense fallback для модальных окон
 */
export const ModalLoadingFallback: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-black via-black to-indigo-950/20 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full animate-pulse"></div>
          <Bot size={64} className="relative mx-auto animate-bounce" />
        </div>
        <p className="text-white/60">Загрузка...</p>
      </div>
    </div>
  );
};

/**
 * Компонент загрузки для страниц
 * Используется в Suspense fallback для полноэкранных страниц
 */
export const PageLoadingFallback: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-full w-full bg-black text-white">
      <div className="text-center space-y-6">
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 bg-indigo-500/30 blur-xl rounded-full animate-pulse"></div>
          <div className="relative animate-spin rounded-full h-16 w-16 border-[3px] border-white/20 border-t-indigo-400"></div>
        </div>
        <div className="space-y-2">
          <p className="text-base text-white/80 font-medium">Загружаем...</p>
        </div>
      </div>
    </div>
  );
};

/**
 * Компонент загрузки для небольших компонентов
 * Используется в Suspense fallback для встроенных компонентов
 */
export const ComponentLoadingFallback: React.FC<{ message?: string }> = ({ message = 'Загрузка...' }) => {
  return (
    <div className="flex items-center justify-center p-8 bg-black/30 rounded-lg">
      <div className="text-center space-y-3">
        <Loader2 size={32} className="mx-auto animate-spin text-indigo-400" />
        <p className="text-sm text-white/60">{message}</p>
      </div>
    </div>
  );
};

/**
 * Универсальный компонент загрузки (используется как LoadingFallback в App.tsx)
 * Сохраняем для обратной совместимости
 */
export const LoadingFallback: React.FC = PageLoadingFallback;

