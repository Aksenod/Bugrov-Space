import React, { useMemo } from 'react';
import { X, Layout, ExternalLink } from 'lucide-react';

type AdminStorybookPageProps = {
  onClose: () => void;
};

export const AdminStorybookPage: React.FC<AdminStorybookPageProps> = ({ onClose }) => {
  const hostedStorybookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin.replace(/\/$/, '')}/storybook/`
      : '/storybook/';

  const storybookUrl =
    import.meta.env.VITE_STORYBOOK_URL ||
    (import.meta.env.PROD ? hostedStorybookUrl : 'http://localhost:6006/');

  const normalizedUrl = useMemo(() => {
    // Если путь заканчивается на '/', добавляем iframe.html для прямого открытия превью
    if (storybookUrl.endsWith('/')) {
      return `${storybookUrl}iframe.html`;
    }
    return storybookUrl.includes('iframe.html') ? storybookUrl : `${storybookUrl}/iframe.html`;
  }, [storybookUrl]);

  return (
    <div className="h-screen bg-gradient-to-br from-black via-black to-indigo-950/20 overflow-hidden flex flex-col">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-6 max-w-6xl w-full flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="mb-4 sm:mb-6 shrink-0">
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-300/80 mb-1">UI Kit</p>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Админ-панель</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-white/70">
                <Layout size={16} />
                <span className="text-sm">Storybook</span>
              </div>
              <button
                onClick={onClose}
                className="px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/20 hover:text-white transition-colors flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
              >
                <X size={16} className="sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Назад</span>
              </button>
            </div>
          </div>
          <p className="text-sm text-white/60">
            Каталог мастер-компонентов. Запускается `npm run storybook` и открывается ниже.
          </p>
        </div>

        <div className="flex-1 min-h-0 rounded-2xl border border-white/10 bg-white/5 overflow-hidden shadow-[0_20px_60px_-30px_rgba(0,0,0,0.6)] flex flex-col items-center justify-center gap-4 text-center px-6 py-10">
          <div className="flex items-center gap-2 text-white/80">
            <Layout size={18} />
            <span className="text-base font-semibold">Storybook открыт в отдельной вкладке</span>
          </div>
          <p className="text-sm text-white/60 max-w-xl">
            Мы больше не встраиваем iframe. Используй ссылку ниже, чтобы открыть UI Kit в новой вкладке и работать с ним отдельно.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.open(normalizedUrl, '_blank', 'noopener')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600/80 hover:bg-indigo-500 text-white border border-indigo-400/30 transition-colors"
            >
              <ExternalLink size={16} />
              <span className="text-sm font-semibold">Открыть Storybook</span>
            </button>
            <button
              onClick={() => window.location.href = normalizedUrl}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/10 transition-colors"
            >
              <Layout size={16} />
              <span className="text-sm font-semibold">Открыть здесь</span>
            </button>
          </div>
          <p className="text-xs text-white/50">
            Текущий адрес: <span className="font-mono text-white/80">{normalizedUrl}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

