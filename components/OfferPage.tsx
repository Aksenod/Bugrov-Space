import React from 'react';
import { X } from 'lucide-react';

interface OfferPageProps {
  onClose: () => void;
}

export const OfferPage: React.FC<OfferPageProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black text-white overflow-y-auto">
      <div className="min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-xl border-b border-white/10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold">Публичная оферта</h1>
            <button
              onClick={onClose}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              title="Закрыть"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-white/5 border border-white/10 rounded-xl p-8">
            <p className="text-white/60 text-center">
              Содержимое публичной оферты будет добавлено позже
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
