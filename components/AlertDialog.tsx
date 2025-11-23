import React, { useEffect } from 'react';
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
  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none"
      onClick={handleBackdropClick}
    >
      {/* Backdrop - only for click-to-close, no blur */}
      <div className="absolute inset-0 bg-transparent transition-opacity animate-in fade-in duration-300 pointer-events-auto" />

      {/* Alert */}
      <div className={`relative w-full max-w-md bg-gradient-to-br from-black/90 via-black/80 to-black/90 backdrop-blur-2xl border border-white/10 rounded-[2rem] ${config.glow} shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 overflow-hidden pointer-events-auto`}>
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
              onClick={onClose}
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

