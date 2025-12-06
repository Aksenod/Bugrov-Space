import React from 'react';
import { Message, Role } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { User, Bot, AlertCircle } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
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

export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({ message }) => {
  const isUser = message.role === Role.USER;
  const isGenerating = !isUser && message.isStreaming && message.text.length === 0;

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
        className={`relative max-w-[88%] md:max-w-[75%] px-5 py-4 backdrop-blur-xl border
          ${
            isUser
              ? 'bg-gradient-to-br from-indigo-600/90 via-indigo-600/80 to-blue-600/80 text-white rounded-[1.5rem] rounded-tr-sm border-white/30 shadow-lg shadow-indigo-500/20' 
              : message.isError
                ? 'bg-red-950/70 border-red-500/40 text-red-50 rounded-[1.5rem] rounded-tl-sm shadow-md shadow-red-500/10'
                : isGenerating
                  ? 'bg-neutral-800/90 text-gray-50 rounded-[1.5rem] rounded-tl-sm border-white/20 shadow-lg shadow-black/50 border-indigo-500/30'
                  : 'bg-neutral-800/90 text-gray-50 rounded-[1.5rem] rounded-tl-sm border-white/20 shadow-lg shadow-black/50' 
          }
        `}
      >
        {isGenerating ? (
          <TypingIndicator />
        ) : (
          message.text.length > 0 && <MarkdownRenderer content={message.text} isCompact />
        )}

        {/* Timestamp */}
        {!isGenerating && (
          <div className={`text-xs mt-2 font-medium tracking-wide flex items-center gap-1 ${isUser ? 'justify-end text-white/70' : 'justify-start text-white/50'}`}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {message.isStreaming && message.text.length > 0 && (
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse shadow-[0_0_6px_rgba(129,140,248,0.9)]" />
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