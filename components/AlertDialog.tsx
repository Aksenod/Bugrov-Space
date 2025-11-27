import React, { useEffect, useState, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import { CheckCircle2, XCircle, Info, AlertCircle, X } from 'lucide-react';

interface AlertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  variant?: 'success' | 'error' | 'info' | 'warning';
  duration?: number; // Auto-close duration in ms (0 = no auto-close)
}

export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  onClose,
  title,
  message,
  variant = 'info',
  duration = 0,
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const handleClose = useCallback(() => {
    // Очищаем предыдущий таймер, если есть
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    
    // Синхронно устанавливаем isClosing, чтобы гарантировать, что компонент останется видимым
    flushSync(() => {
      setIsClosing(true);
    });
    
    // Не сбрасываем isVisible сразу, чтобы анимация закрытия работала
    // Используем requestAnimationFrame для гарантии, что браузер успел применить стили
    requestAnimationFrame(() => {
      closeTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          onClose();
          setIsClosing(false);
          setIsVisible(false);
        }
        closeTimeoutRef.current = null;
      }, 300); // Match animation duration
    });
  }, [onClose]);

  useEffect(() => {
    isMountedRef.current = true;
    
    if (isOpen) {
      setIsClosing(false);
      // Небольшая задержка для запуска анимации появления
      const visibilityTimer = setTimeout(() => {
        if (isMountedRef.current) {
          setIsVisible(true);
        }
      }, 10);
      
      let autoCloseTimer: NodeJS.Timeout | undefined;
      if (duration > 0) {
        autoCloseTimer = setTimeout(() => {
          handleClose();
        }, duration);
      }
      
      return () => {
        clearTimeout(visibilityTimer);
        if (autoCloseTimer) {
          clearTimeout(autoCloseTimer);
        }
      };
    } else {
      // Не сбрасываем isVisible сразу, если идет анимация закрытия
      // isVisible будет сброшен после завершения анимации в handleClose
      if (!isClosing) {
        setIsVisible(false);
      }
    }
  }, [isOpen, duration, handleClose, isClosing]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  if (!isOpen && !isClosing) return null;

  const variantConfig = {
    success: {
      icon: CheckCircle2,
      iconBg: 'bg-emerald-500/20',
      iconColor: 'text-emerald-400',
      iconBorder: 'border-emerald-500/30',
      gradient: 'from-emerald-500/50 via-emerald-400/30 to-transparent',
      glow: 'shadow-[0_0_30px_rgba(16,185,129,0.2)]',
    },
    error: {
      icon: XCircle,
      iconBg: 'bg-red-500/20',
      iconColor: 'text-red-400',
      iconBorder: 'border-red-500/30',
      gradient: 'from-red-500/50 via-red-400/30 to-transparent',
      glow: 'shadow-[0_0_30px_rgba(239,68,68,0.2)]',
    },
    warning: {
      icon: AlertCircle,
      iconBg: 'bg-amber-500/20',
      iconColor: 'text-amber-400',
      iconBorder: 'border-amber-500/30',
      gradient: 'from-amber-500/50 via-amber-400/30 to-transparent',
      glow: 'shadow-[0_0_30px_rgba(245,158,11,0.2)]',
    },
    info: {
      icon: Info,
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-400',
      iconBorder: 'border-blue-500/30',
      gradient: 'from-blue-500/50 via-blue-400/30 to-transparent',
      glow: 'shadow-[0_0_30px_rgba(59,130,246,0.2)]',
    },
  };

  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-start justify-center p-4 pt-6 pointer-events-none"
    >
      {/* Alert */}
      <div className={`relative w-full max-w-md bg-gradient-to-br from-black/90 via-black/80 to-black/90 backdrop-blur-2xl border border-white/10 rounded-[2rem] ${config.glow} shadow-2xl overflow-hidden pointer-events-auto transition-all duration-300 ease-out ${
        isClosing 
          ? 'opacity-0 -translate-y-4 scale-95' 
          : isVisible
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-4 scale-95'
      }`}>
        {/* Decorative gradient overlay */}
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${config.gradient}`} />

        {/* Content */}
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className={`p-2.5 ${config.iconBg} ${config.iconBorder} border rounded-xl flex-shrink-0`}>
              <Icon size={20} className={config.iconColor} />
            </div>
            <div className="flex-1 min-w-0">
              {title && (
                <h3 className="text-base font-bold text-white mb-1.5">{title}</h3>
              )}
              <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line">
                {message}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors flex-shrink-0"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

