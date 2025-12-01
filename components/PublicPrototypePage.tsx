import React, { useEffect, useState } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

interface PublicPrototypePageProps {
  prototypeHash: string;
  onClose: () => void;
}

export const PublicPrototypePage: React.FC<PublicPrototypePageProps> = ({ prototypeHash, onClose }) => {
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPrototype = async () => {
      try {
        setIsLoading(true);
        const response = await api.getPublicPrototype(prototypeHash);
        setHtmlContent(response.prototype.html);
        setError(null);
      } catch (err: any) {
        console.error('Failed to load prototype:', err);
        setError(err?.message || 'Не удалось загрузить прототип');
      } finally {
        setIsLoading(false);
      }
    };

    loadPrototype();
  }, [prototypeHash]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/80 backdrop-blur-md border-b border-white/10">
        <h1 className="text-white font-medium">Просмотр прототипа</h1>
        <button
          onClick={onClose}
          className="p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          aria-label="Закрыть"
        >
          <X size={24} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4">
              <Loader2 size={48} className="mx-auto animate-spin text-indigo-400" />
              <p className="text-white/60">Загрузка прототипа...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-4 max-w-md p-6">
              <AlertCircle size={48} className="mx-auto text-red-400" />
              <p className="text-white/80 font-medium">Ошибка загрузки</p>
              <p className="text-white/50 text-sm">{error}</p>
            </div>
          </div>
        ) : htmlContent ? (
          <iframe
            srcDoc={htmlContent}
            className="w-full h-full border-0"
            title="Prototype Preview"
            sandbox="allow-same-origin allow-scripts"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-white/50">Прототип не найден</p>
          </div>
        )}
      </div>
    </div>
  );
};
