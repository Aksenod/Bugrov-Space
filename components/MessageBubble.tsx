import React from 'react';
import { Message, Role } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { User, Bot, AlertCircle, Trash2, Copy } from 'lucide-react';

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

  const handleCopy = React.useCallback(() => {
    if (!message.text) return;

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
    }, 1600);
  }, [message.text]);

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
        className={`relative px-5 py-4 backdrop-blur-xl border scrollbar-thin
          ${
            isUser
              ? 'bg-gradient-to-br from-indigo-600/90 via-indigo-600/80 to-blue-600/80 text-white rounded-[1.5rem] rounded-tr-sm border-white/30 shadow-lg shadow-indigo-500/20 max-w-[88%] md:max-w-[75%]' 
              : message.isError
                ? 'bg-red-950/70 border-red-500/40 text-red-50 rounded-[1.5rem] rounded-tl-sm shadow-md shadow-red-500/10'
                : isGenerating
                  ? 'bg-neutral-800/90 text-gray-50 rounded-[1.5rem] rounded-tl-sm border-white/20 shadow-lg shadow-black/50 border-indigo-500/30'
                  : 'bg-neutral-800/90 text-gray-50 rounded-[1.5rem] rounded-tl-sm border-white/20 shadow-lg shadow-black/50' 
          }
        `}
        style={{ 
          maxWidth: isUser ? undefined : 'none',
          overflowX: 'auto',
          overflowY: 'visible',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {isCopyToastVisible && (
          <div className="absolute -top-4 right-3 z-30 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-semibold text-white/80 shadow-lg shadow-indigo-500/30 backdrop-blur-md">
            Скопировано
          </div>
        )}
        {isGenerating ? (
          <TypingIndicator />
        ) : (
          message.text.length > 0 && <MarkdownRenderer content={message.text} isCompact />
        )}

        {/* Timestamp */}
        {!isGenerating && (
          <div className={`text-xs mt-2 font-medium tracking-wide flex items-center gap-2 ${isUser ? 'justify-end text-white/70' : 'justify-start text-white/50'}`}>
            <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            {message.isStreaming && message.text.length > 0 && (
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse shadow-[0_0_6px_rgba(129,140,248,0.9)]" />
            )}
            {(canCopy || canDelete) && (
              <div className="ml-auto flex items-center gap-2">
                {canCopy && (
                  <button
                    type="button"
                    aria-label="Скопировать сообщение"
                    onClick={handleCopy}
                    className="p-1.5 rounded-full bg-white/5 border border-white/10 text-white/60 opacity-70 transition-all hover:bg-white/15 hover:text-white hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/30"
                  >
                    <Copy size={14} />
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    aria-label="Удалить сообщение"
                    onClick={handleDeleteClick}
                    className={`p-1.5 rounded-full transition-all focus:outline-none focus:ring-2 ${
                      deleteCountdown !== null
                        ? 'bg-red-600/20 border border-red-500/50 text-red-100 hover:bg-red-600/30 focus:ring-red-400/50'
                        : 'bg-white/5 border border-white/10 text-white/60 opacity-70 hover:bg-white/15 hover:text-white hover:opacity-100 focus:ring-white/30'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <Trash2 size={14} />
                      <span className="text-[11px] font-semibold">
                        {deleteCountdown !== null ? `${deleteCountdown}s` : ''}
                      </span>
                    </div>
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