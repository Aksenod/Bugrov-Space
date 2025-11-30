import React from 'react';
import { X } from 'lucide-react';

interface FeedbackPageProps {
  onClose: () => void;
}

export const FeedbackPage: React.FC<FeedbackPageProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="relative w-full max-w-4xl h-[90vh] bg-black/90 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl m-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">Обратная связь</h2>
          <button
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            title="Закрыть"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            <p className="text-white/80 text-lg">
              Здесь будет форма обратной связи. Скажите, что вы хотите видеть на этой странице.
            </p>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
              <h3 className="text-xl font-semibold text-white">Что вы хотите добавить?</h3>
              <ul className="list-disc list-inside text-white/70 space-y-2">
                <li>Форму для отправки отзывов?</li>
                <li>Контактную информацию?</li>
                <li>FAQ?</li>
                <li>Что-то еще?</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
