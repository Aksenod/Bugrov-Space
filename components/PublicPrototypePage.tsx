import React, { useEffect, useState, useRef } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

interface PublicPrototypePageProps {
  prototypeHash: string;
  versionNumber?: number;
  onClose: () => void;
}

export const PublicPrototypePage: React.FC<PublicPrototypePageProps> = ({ prototypeHash, versionNumber, onClose }) => {
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isHeaderHidden, setIsHeaderHidden] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadPrototype = async () => {
      try {
        setIsLoading(true);
        const response = await api.getPublicPrototype(prototypeHash, versionNumber);
        setHtmlContent(response.prototype.html);
        setUsername(response.prototype.username);
        setError(null);
      } catch (err: any) {
        console.error('Failed to load prototype:', err);
        setError(err?.message || 'Не удалось загрузить прототип');
      } finally {
        setIsLoading(false);
      }
    };

    loadPrototype();
  }, [prototypeHash, versionNumber]);

  useEffect(() => {
    if (!htmlContent) return;

    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleWheel = (e: WheelEvent) => {
      // Проверяем, что событие происходит над iframe
      const rect = iframe.getBoundingClientRect();
      const isOverIframe = 
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;

      if (!isOverIframe) {
        return;
      }

      const scrollingDown = e.deltaY > 0;
      const scrollingUp = e.deltaY < 0;

      // При скролле вниз - поднимаем хедер вверх на 100% его высоты
      if (scrollingDown) {
        setIsHeaderHidden(true);
      } 
      // При скролле вверх - возвращаем хедер на место
      else if (scrollingUp) {
        setIsHeaderHidden(false);
      }

      // Программно скроллим iframe
      if (iframe.contentWindow) {
        try {
          const currentScrollY = iframe.contentWindow.scrollY || iframe.contentWindow.pageYOffset || 0;
          const currentScrollX = iframe.contentWindow.scrollX || iframe.contentWindow.pageXOffset || 0;
          iframe.contentWindow.scrollTo({
            left: currentScrollX + e.deltaX,
            top: currentScrollY + e.deltaY,
            behavior: 'auto'
          });
        } catch (err) {
          // Error scrolling iframe - non-critical
        }
      }
    };

    // Отслеживаем wheel на window с capture фазой
    window.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    
    return () => {
      window.removeEventListener('wheel', handleWheel, { capture: true } as EventListenerOptions);
    };
  }, [htmlContent]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col" data-prototype-container>
      {/* Header */}
      <div 
        ref={headerRef}
        className="flex items-center justify-between p-4 bg-black/80 backdrop-blur-md border-b border-white/10 transition-transform duration-300 ease-in-out relative z-10"
        style={{
          transform: isHeaderHidden ? 'translateY(-100%)' : 'translateY(0)',
        }}
      >
        <h1 className="text-white font-medium">
          Просмотр прототипа
        </h1>
        <button
          onClick={() => window.open('https://bugrov.space', '_blank')}
          className="px-3 py-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 text-white text-xs font-medium rounded-full shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 hover:scale-105 active:scale-95 backdrop-blur-sm border border-white/20"
          aria-label="Перейти на Bugrov.space"
        >
          <span className="flex flex-col md:flex-row items-center">
            <span>Сделано на</span>
            <span className="font-bold">Bugrov.space</span>
          </span>
        </button>
      </div>

      {/* Content */}
      <div ref={scrollContainerRef} className="flex-1 overflow-auto">
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
            ref={iframeRef}
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
