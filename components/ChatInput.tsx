import React, { useState, useRef, useEffect } from 'react';
import { SendHorizontal, X, Mic } from 'lucide-react';
import { useVoiceInput } from '../hooks/useVoiceInput';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled: boolean;
  isLoading?: boolean;
  onCancel?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled, isLoading = false, onCancel }) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Упрощенная логика авто-высоты textarea
  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Если текст пустой, устанавливаем строго 48px
    if (!input.trim()) {
      textarea.style.height = '48px';
      textarea.style.overflowY = 'hidden';
      return;
    }

    // Временно устанавливаем минимальную высоту для измерения
    textarea.style.height = '48px';
    const scrollHeight = textarea.scrollHeight;
    
    // Вычисляем высоту одной строки с учетом padding и line-height
    const singleLineHeight = 48; // minHeight = 48px
    
    // Увеличиваем высоту только если текст не помещается в одну строку
    // Используем небольшой порог (2px) для учета погрешностей округления
    if (scrollHeight <= singleLineHeight + 2) {
      // Текст помещается в одну строку - оставляем минимальную высоту
      textarea.style.height = '48px';
      textarea.style.overflowY = 'hidden';
    } else {
      // Текст не помещается - увеличиваем высоту
      const newHeight = Math.min(scrollHeight, 200);
      textarea.style.height = `${newHeight}px`;
      textarea.style.overflowY = scrollHeight > 200 ? 'auto' : 'hidden';
    }
  };

  // Автоматически подстраиваем высоту при изменении текста
  useEffect(() => {
    adjustHeight();
  }, [input]);

  // Устанавливаем начальную высоту при монтировании
  useEffect(() => {
    adjustHeight();
  }, []);

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
      // Высота сбросится автоматически через useEffect при изменении input
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Обработчик фокуса - предотвращаем перенос курсора на вторую строку на мобильных
  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    
    // Если текст пустой, устанавливаем курсор в начало
    if (!input.trim()) {
      // Используем setTimeout для гарантии, что браузер завершил обработку фокуса
      setTimeout(() => {
        textarea.setSelectionRange(0, 0);
        // Принудительно устанавливаем высоту 48px для пустого textarea
        textarea.style.height = '48px';
        textarea.style.overflowY = 'hidden';
      }, 0);
    } else {
      // Если есть текст, устанавливаем курсор в конец, но на той же строке
      setTimeout(() => {
        const length = input.length;
        textarea.setSelectionRange(length, length);
      }, 0);
    }
  };

  // Обработка результатов голосового ввода - сразу вставляем исправленный текст
  const handleVoiceTextReady = (originalText: string, correctedText: string) => {
    setInput(correctedText);
    
    // Фокусируем textarea после вставки текста
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const length = correctedText.length;
        textareaRef.current.setSelectionRange(length, length);
        // Высота обновится автоматически через useEffect
      }
    }, 0);
  };

  const handleVoiceError = (error: string) => {
    // Ошибки обрабатываются внутри хука, здесь можно добавить дополнительную обработку
    console.error('Voice input error:', error);
  };

  const { 
    isRecording, 
    isProcessing: isVoiceProcessing, 
    error: voiceError,
    recordingDuration,
    startRecording, 
    stopRecording,
    cancelRecording 
  } = useVoiceInput(handleVoiceTextReady, handleVoiceError);

  // Переключение записи
  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const hasText = input.trim().length > 0;
  const showMicAsPrimary = !hasText && !isLoading;
  const showSendButton = hasText || isLoading;

  return (
    <div className="w-full max-w-3xl mx-auto relative group">
      {/* Glow Effect behind input */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-[1.5rem] blur opacity-20 group-hover:opacity-40 transition-all duration-500 ease-out group-focus-within:opacity-60 group-focus-within:blur-md"></div>

      <div className="relative flex items-end bg-gradient-to-br from-black/70 via-black/60 to-black/70 backdrop-blur-xl border border-white/10 rounded-[1.5rem] shadow-2xl shadow-indigo-500/10 transition-all group-focus-within:border-white/20 group-focus-within:shadow-indigo-500/30 group-focus-within:shadow-lg">
        {/* Textarea - занимает всё доступное пространство, выровнен по верху */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder={disabled ? "Подключение..." : "Напишите мне ..."}
          disabled={disabled}
          rows={1}
          className="flex-1 self-start bg-transparent text-white placeholder-white/30 text-base px-3 py-3 focus:outline-none focus:ring-0 resize-none no-scrollbar font-medium"
          style={{ 
            height: '48px',
            minHeight: '48px',
            maxHeight: '200px',
            lineHeight: '24px',
            boxSizing: 'border-box',
            overflowY: 'hidden'
          }}
        />

        {/* Функциональная группа кнопок - справа */}
        <div className="flex-shrink-0 flex items-center gap-2 pr-[5px] pl-2 pb-[5px]">
          {/* Микрофон - показываем если нет текста или если есть текст (как вторичная кнопка) */}
          {!isLoading && (
            <button
              onClick={handleMicClick}
              disabled={disabled || isVoiceProcessing}
              className={`p-2.5 rounded-full transition-all duration-300 ease-out will-change-transform ${
                isRecording
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:scale-110 active:scale-95'
                  : showMicAsPrimary
                  ? 'bg-white text-black hover:bg-indigo-50 shadow-[0_0_15px_rgba(255,255,255,0.3)] hover:scale-110 active:scale-95 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]'
                  : disabled || isVoiceProcessing
                  ? 'bg-white/5 text-white/20 cursor-not-allowed'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
              }`}
              title={isRecording ? `Запись... ${recordingDuration}с` : 'Голосовой ввод'}
            >
              <Mic size={18} className={isRecording ? 'animate-pulse' : ''} />
            </button>
          )}

          {/* Кнопка отправки/отмены */}
          {showSendButton && (
            <>
              {isLoading && onCancel ? (
                <button
                  onClick={onCancel}
                  className="p-2.5 rounded-full transition-all duration-300 ease-out will-change-transform bg-red-500/20 text-red-400 hover:bg-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:scale-110 active:scale-95 hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] border border-red-500/30"
                  title="Остановить генерацию"
                >
                  <X size={18} />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!hasText || disabled || isVoiceProcessing}
                  className={`p-2.5 rounded-full transition-all duration-300 ease-out will-change-transform ${
                    !hasText || disabled || isVoiceProcessing
                      ? 'bg-white/5 text-white/20 cursor-not-allowed'
                      : 'bg-white text-black hover:bg-indigo-50 shadow-[0_0_15px_rgba(255,255,255,0.3)] hover:scale-110 active:scale-95 hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]'
                  }`}
                  title="Отправить сообщение"
                >
                  <SendHorizontal size={18} className="ml-0.5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Индикатор обработки голосового ввода */}
      {isVoiceProcessing && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-indigo-500/20 border border-indigo-500/30 rounded-xl backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 text-sm text-indigo-300">
            <div className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
            <span>Расшифровка...</span>
          </div>
        </div>
      )}
    </div>
  );
};