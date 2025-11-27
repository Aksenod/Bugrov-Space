import React, { useState, useRef, useEffect } from 'react';
import { SendHorizontal, Sparkles } from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isAdjustingRef = useRef(false);

  // Устанавливаем начальную высоту при монтировании
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '48px';
      textareaRef.current.style.minHeight = '48px';
      textareaRef.current.style.maxHeight = '48px';
      textareaRef.current.style.overflowY = 'hidden';
    }
  }, []);

  const adjustHeight = () => {
    if (isAdjustingRef.current) return;
    
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    // Если текст пустой, не изменяем высоту
    if (!input.trim()) {
      textarea.style.height = '48px';
      textarea.style.minHeight = '48px';
      textarea.style.maxHeight = '48px';
      textarea.style.overflowY = 'hidden';
      return;
    }

    isAdjustingRef.current = true;
    
    // Сохраняем текущую высоту
    const currentHeight = parseInt(textarea.style.height) || 48;
    
    // Временно устанавливаем auto для измерения
    const originalOverflow = textarea.style.overflowY;
    const originalMinHeight = textarea.style.minHeight;
    const originalMaxHeight = textarea.style.maxHeight;
    
    textarea.style.overflowY = 'hidden';
    textarea.style.minHeight = 'auto';
    textarea.style.maxHeight = '150px';
    textarea.style.height = 'auto';
    
    const scrollHeight = textarea.scrollHeight;
    const newHeight = Math.min(scrollHeight, 150);
    
    // Устанавливаем новую высоту только если она действительно изменилась
    if (Math.abs(newHeight - currentHeight) > 1) {
      textarea.style.height = `${newHeight}px`;
      // Показываем скролл только если контент переполняется
      if (newHeight >= 150) {
        textarea.style.overflowY = 'auto';
      } else {
        textarea.style.overflowY = 'hidden';
      }
    } else {
      // Возвращаем исходную высоту
      textarea.style.height = `${currentHeight}px`;
      textarea.style.overflowY = originalOverflow || 'hidden';
    }
    
    // Восстанавливаем min/max height только если они были установлены
    if (originalMinHeight) textarea.style.minHeight = originalMinHeight;
    if (originalMaxHeight) textarea.style.maxHeight = originalMaxHeight;
    
    isAdjustingRef.current = false;
  };

  useEffect(() => {
    if (input.trim()) {
      // Небольшая задержка для предотвращения мерцания
      requestAnimationFrame(() => {
        adjustHeight();
      });
    } else {
      // Если текст пустой, сбрасываем к минимальной высоте и фиксируем её
      if (textareaRef.current) {
        textareaRef.current.style.height = '48px';
        textareaRef.current.style.overflowY = 'hidden';
        // Предотвращаем изменение высоты при фокусе
        textareaRef.current.style.minHeight = '48px';
        textareaRef.current.style.maxHeight = '48px';
      }
    }
  }, [input]);

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = '48px';
        textareaRef.current.style.minHeight = '48px';
        textareaRef.current.style.maxHeight = '48px';
        textareaRef.current.style.overflowY = 'hidden';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto relative group">
      {/* Glow Effect behind input */}
      <div className={`absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-[1.5rem] blur opacity-20 group-hover:opacity-40 transition-all duration-500 ease-out group-focus-within:opacity-60 group-focus-within:blur-md`}></div>

      <div className="relative flex items-center bg-gradient-to-br from-black/70 via-black/60 to-black/70 backdrop-blur-xl border border-white/10 rounded-[1.5rem] shadow-2xl shadow-indigo-500/10 transition-all group-focus-within:border-white/20 group-focus-within:shadow-indigo-500/30 group-focus-within:shadow-lg">
        <div className="pl-3 flex-shrink-0 text-white/40 flex items-center">
            <Sparkles size={18} className={`transition-colors duration-300 ${input.trim() ? 'text-indigo-400' : ''}`} />
        </div>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={(e) => {
            // Если текст пустой, фиксируем высоту на 48px и предотвращаем любое изменение
            if (!input.trim()) {
              e.currentTarget.style.height = '48px';
              e.currentTarget.style.minHeight = '48px';
              e.currentTarget.style.maxHeight = '48px';
              e.currentTarget.style.overflowY = 'hidden';
            } else {
              // Если есть текст, сохраняем текущую высоту
              const currentHeight = e.currentTarget.style.height || '48px';
              requestAnimationFrame(() => {
                if (e.currentTarget.style.height !== currentHeight) {
                  e.currentTarget.style.height = currentHeight;
                }
              });
            }
          }}
          onBlur={(e) => {
            // Сохраняем высоту при потере фокуса
            if (e.currentTarget) {
              const currentHeight = e.currentTarget.style.height;
              requestAnimationFrame(() => {
                if (e.currentTarget && e.currentTarget.style.height !== currentHeight) {
                  e.currentTarget.style.height = currentHeight;
                }
              });
            }
          }}
          placeholder={disabled ? "Connecting..." : "Ask anything..."}
          disabled={disabled}
          className="w-full bg-transparent text-white placeholder-white/30 text-base px-3 py-3.5 max-h-[150px] min-h-[48px] focus:outline-none focus:ring-0 resize-none no-scrollbar font-medium leading-relaxed"
          rows={1}
          style={{ height: '48px', overflowY: 'hidden' }}
        />
        <div className="pr-1.5 flex-shrink-0 flex items-center">
          <button
            onClick={handleSend}
            disabled={!input.trim() || disabled}
            className={`p-2.5 rounded-full transition-all duration-300 ease-out will-change-transform ${
              !input.trim() || disabled
                ? 'bg-white/5 text-white/20 cursor-not-allowed'
                : 'bg-white text-black hover:bg-indigo-50 shadow-[0_0_15px_rgba(255,255,255,0.3)] hover:scale-110 active:scale-95 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]'
            }`}
          >
            <SendHorizontal size={18} className={!input.trim() ? "" : "ml-0.5"} />
          </button>
        </div>
      </div>
    </div>
  );
};