import React from 'react';
import { X, Layout } from 'lucide-react';

type AdminStorybookPageProps = {
  onClose: () => void;
};

export const AdminStorybookPage: React.FC<AdminStorybookPageProps> = ({ onClose }) => {
  const storybookUrl = import.meta.env.VITE_STORYBOOK_URL ?? 'http://localhost:6006/';

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

        <div className="flex-1 min-h-0 rounded-2xl border border-white/10 bg-white/5 overflow-hidden shadow-[0_20px_60px_-30px_rgba(0,0,0,0.6)]">
          <iframe
            title="Storybook"
            src={storybookUrl}
            className="w-full h-full bg-white"
            allow="clipboard-read; clipboard-write"
          />
        </div>
      </div>
    </div>
  );
};

