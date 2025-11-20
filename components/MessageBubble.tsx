import React from 'react';
import { Message, Role } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { User, Bot, Loader2, AlertCircle } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === Role.USER;

  return (
    <div className={`relative z-20 flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'} group animate-in fade-in slide-in-from-bottom-2 duration-500`}>
      
      {/* Avatar for Bot */}
      {!isUser && (
        <div className="flex-shrink-0 mr-3 mt-1">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-xl shadow-[0_0_10px_rgba(0,0,0,0.3)] border border-white/10 ${message.isError ? 'bg-red-500/20 text-red-400' : 'bg-zinc-800 text-white'}`}>
            {message.isError ? <AlertCircle size={14} /> : <Bot size={16} />}
          </div>
        </div>
      )}

      <div
        className={`relative max-w-[88%] md:max-w-[80%] px-5 py-3 backdrop-blur-xl border
          ${
            isUser
              ? 'bg-gradient-to-br from-indigo-600/90 via-indigo-600/80 to-blue-600/80 text-white rounded-[1.5rem] rounded-tr-sm border-white/20 shadow-lg' 
              : message.isError
                ? 'bg-red-950/60 border-red-500/30 text-red-100 rounded-[1.5rem] rounded-tl-sm'
                : 'bg-neutral-800 text-gray-100 rounded-[1.5rem] rounded-tl-sm border-white/10 shadow-md shadow-black/40' 
          }
        `}
      >
        {message.isStreaming && message.text.length === 0 ? (
          <div className="flex items-center gap-2 text-white/50 py-1">
             <div className="relative">
                <div className="absolute inset-0 bg-indigo-500 blur rounded-full opacity-50 animate-pulse"></div>
                <Loader2 className="w-4 h-4 animate-spin relative z-10" />
             </div>
             <span className="text-xs font-medium tracking-wide">Thinking...</span>
          </div>
        ) : (
          <MarkdownRenderer content={message.text} />
        )}

        {/* Timestamp */}
        <div className={`text-[9px] mt-1.5 font-medium tracking-wide flex items-center gap-1 ${isUser ? 'justify-end text-white/60' : 'justify-start text-white/40'}`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {message.isStreaming && <span className="w-1 h-1 bg-indigo-400 rounded-full animate-pulse shadow-[0_0_5px_rgba(129,140,248,0.8)]" />}
        </div>
      </div>

      {/* Avatar for User */}
      {isUser && (
        <div className="flex-shrink-0 ml-3 mt-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white shadow-lg border border-white/20">
            <User size={14} />
          </div>
        </div>
      )}
    </div>
  );
};