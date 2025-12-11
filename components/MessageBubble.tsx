import React from 'react';
import { Message, Role } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { User, Bot, AlertCircle, Trash2, Copy, Check } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  onDelete?: (messageId: string) => void;
}

/**
 * Компонент анимации печатания (три точки)
 */
const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '0ms', animationDuration: '1.4s' }} />
      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '200ms', animationDuration: '1.4s' }} />
      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" style={{ animationDelay: '400ms', animationDuration: '1.4s' }} />
    </div>
  );
};

export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({ message, onDelete }) => {
  const isUser = message.role === Role.USER;
  const isGenerating = !isUser && message.isStreaming && message.text.length === 0;
  const isTemporary = message.id.startsWith('temp-') || message.id.startsWith('loading-');
  const isTransientError = message.id.startsWith('error-');
  const canDelete = !!onDelete && !isGenerating && !isTemporary && !isTransientError;
  const canCopy = !isGenerating && message.text.length > 0;
  const [isCopyToastVisible, setIsCopyToastVisible] = React.useState(false);
  const copyToastTimerRef = React.useRef<number | null>(null);
  const [deleteCountdown, setDeleteCountdown] = React.useState<number | null>(null);
  const deleteTimeoutRef = React.useRef<number | null>(null);
  const deleteIntervalRef = React.useRef<number | null>(null);
  const COUNTDOWN_START = 5;

  const resetDeleteState = React.useCallback(() => {
    if (deleteTimeoutRef.current) {
      window.clearTimeout(deleteTimeoutRef.current);
      deleteTimeoutRef.current = null;
    }
    if (deleteIntervalRef.current) {
      window.clearInterval(deleteIntervalRef.current);
      deleteIntervalRef.current = null;
    }
    setDeleteCountdown(null);
  }, []);

  React.useEffect(() => {
    return () => {
      if (copyToastTimerRef.current) {
        window.clearTimeout(copyToastTimerRef.current);
      }
      if (deleteTimeoutRef.current) {
        window.clearTimeout(deleteTimeoutRef.current);
      }
      if (deleteIntervalRef.current) {
        window.clearInterval(deleteIntervalRef.current);
      }
    };
  }, []);

  const handleCopy = React.useCallback(() => {
    if (!message.text) return;

    // Отменяем удаление при копировании
    if (deleteCountdown !== null) {
      resetDeleteState();
    }

    const text = typeof message.text === 'string' ? message.text : String(message.text);

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(console.error);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    setIsCopyToastVisible(true);
    if (copyToastTimerRef.current) {
      window.clearTimeout(copyToastTimerRef.current);
    }
    copyToastTimerRef.current = window.setTimeout(() => {
      setIsCopyToastVisible(false);
      copyToastTimerRef.current = null;
    }, 2000);
  }, [message.text, deleteCountdown, resetDeleteState]);

  // Сбрасываем таймер при смене сообщения
  React.useEffect(() => {
    resetDeleteState();
  }, [message.id, resetDeleteState]);

  const handleDeleteClick = React.useCallback(() => {
    if (!canDelete) return;

    // Повторный клик отменяет удаление
    if (deleteCountdown !== null) {
      resetDeleteState();
      return;
    }

    setDeleteCountdown(COUNTDOWN_START);

    deleteIntervalRef.current = window.setInterval(() => {
      setDeleteCountdown((prev) => {
        if (prev === null) return null;
        const next = prev - 1;
        if (next <= 0 && deleteIntervalRef.current) {
          window.clearInterval(deleteIntervalRef.current);
          deleteIntervalRef.current = null;
        }
        return Math.max(next, 0);
      });
    }, 1000);

    deleteTimeoutRef.current = window.setTimeout(() => {
      resetDeleteState();
      onDelete?.(message.id);
    }, COUNTDOWN_START * 1000);
  }, [canDelete, deleteCountdown, onDelete, message.id, resetDeleteState]);

  return (
    <div className={`relative z-20 flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'} group animate-in fade-in slide-in-from-bottom-2 duration-500`}>
      
      {/* Avatar for Bot */}
      {!isUser && (
        <div className="flex-shrink-0 mr-3 mt-1">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-xl shadow-md border transition-all duration-300 ${
            message.isError 
              ? 'bg-red-500/25 text-red-300 border-red-500/30 shadow-red-500/20' 
              : isGenerating
                ? 'bg-zinc-800/90 text-white border-white/20 shadow-black/30 animate-pulse shadow-indigo-500/30'
                : 'bg-zinc-800/90 text-white border-white/20 shadow-black/30'
          }`}>
            {message.isError ? <AlertCircle size={14} /> : <Bot size={16} />}
          </div>
        </div>
      )}

      <div
        className={`relative px-5 py-4 backdrop-blur-xl border scrollbar-thin min-w-0 w-full max-w-[96%] sm:max-w-[90%]
          ${
            isUser
              ? 'bg-gradient-to-br from-indigo-600/90 via-indigo-600/80 to-blue-600/80 text-white rounded-[1.5rem] rounded-tr-sm border-white/30 shadow-lg shadow-indigo-500/20 max-w-[88%] md:max-w-[75%]' 
              : message.isError
                ? 'bg-red-950/70 border-red-500/40 text-red-50 rounded-[1.5rem] rounded-tl-sm shadow-md shadow-red-500/10 sm:max-w-[85%]'
                : isGenerating
                  ? 'bg-neutral-800/90 text-gray-50 rounded-[1.5rem] rounded-tl-sm border-white/20 shadow-lg shadow-black/50 border-indigo-500/30 sm:max-w-[85%]'
                  : 'bg-neutral-800/90 text-gray-50 rounded-[1.5rem] rounded-tl-sm border-white/20 shadow-lg shadow-black/50 sm:max-w-[85%]' 
          }
        `}
        style={{ 
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {isGenerating ? (
          <TypingIndicator />
        ) : (
          message.text.length > 0 && (
            <div className="w-full overflow-x-auto scrollbar-thin">
              <MarkdownRenderer content={message.text} isCompact />
            </div>
          )
        )}

        {/* Timestamp and Actions */}
        {!isGenerating && (
          <div className={`mt-2 text-xs font-medium tracking-wide flex items-center gap-2 overflow-visible ${isUser ? 'justify-end text-white/70' : 'justify-start text-white/50'}`}>
            <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            {message.isStreaming && message.text.length > 0 && (
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse shadow-[0_0_6px_rgba(129,140,248,0.9)]" />
            )}
            
            {/* Status messages and action buttons */}
            {(canCopy || canDelete || isCopyToastVisible || deleteCountdown !== null) && (
              <div className="flex items-center gap-2 sm:gap-2.5 ml-auto overflow-visible" aria-live={deleteCountdown !== null ? 'assertive' : 'polite'} aria-atomic="true">
                {canCopy && (
                  <div className="relative overflow-visible">
                    {isCopyToastVisible && (
                      <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/40 text-xs font-semibold text-green-300 shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-right-2 duration-300 whitespace-nowrap z-50">
                        <Check size={13} className="text-green-400" />
                        <span>Скопировано</span>
                      </div>
                    )}
                    <button
                      type="button"
                      aria-label={isCopyToastVisible ? 'Текст скопирован' : 'Скопировать сообщение'}
                      onClick={handleCopy}
                      className={`flex items-center justify-center w-11 h-11 sm:w-9 sm:h-9 rounded-full border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent active:translate-y-px ${
                        isCopyToastVisible
                          ? 'bg-green-500/20 border-green-500/40 text-green-300 shadow-lg focus:ring-green-400/50'
                          : 'bg-white/5 border-white/10 text-white/60 opacity-70 shadow-md hover:bg-white/10 hover:text-white hover:opacity-100 focus:ring-white/30'
                      }`}
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                )}
                {canDelete && (
                  <button
                    type="button"
                    aria-label={
                      deleteCountdown !== null ? `Отменить удаление. Осталось ${deleteCountdown} ${deleteCountdown === 1 ? 'секунда' : deleteCountdown < 5 ? 'секунды' : 'секунд'}` : 'Удалить сообщение'
                    }
                    onClick={handleDeleteClick}
                    className={`relative flex items-center justify-center w-11 h-11 sm:w-9 sm:h-9 rounded-full border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent active:translate-y-px ${
                      deleteCountdown !== null
                        ? 'bg-red-600/25 border-red-500/50 text-red-100 shadow-lg hover:bg-red-600/35 focus:ring-red-400/50'
                        : 'bg-white/5 border-white/10 text-white/60 opacity-70 shadow-md hover:bg-white/10 hover:text-white hover:opacity-100 focus:ring-white/30'
                    }`}
                  >
                    <Trash2 size={14} />
                    {deleteCountdown !== null && (
                      <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold leading-none shadow-lg animate-in zoom-in-50 duration-300">
                        {deleteCountdown}
                      </span>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Avatar for User */}
      {isUser && (
        <div className="flex-shrink-0 ml-3 mt-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 border border-white/30">
            <User size={14} />
          </div>
        </div>
      )}
    </div>
  );
});