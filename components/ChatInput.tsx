import React, { useState, useRef, useEffect } from 'react';
import { SendHorizontal, Sparkles } from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [input]);

  const handleSend = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
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
      <div className={`absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-[1.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-focus-within:opacity-50 group-focus-within:blur-md`}></div>

      <div className="relative flex items-end bg-black/60 backdrop-blur-xl border border-white/10 rounded-[1.5rem] shadow-2xl transition-all">
        <div className="pl-3 pb-3 text-white/40">
            <Sparkles size={18} className={`transition-colors duration-300 ${input.trim() ? 'text-indigo-400' : ''}`} />
        </div>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Connecting..." : "Ask anything..."}
          disabled={disabled}
          className="w-full bg-transparent text-white placeholder-white/30 text-sm px-3 py-3.5 max-h-[150px] min-h-[48px] focus:outline-none resize-none overflow-y-auto scrollbar-hide font-medium leading-relaxed"
          rows={1}
        />
        <div className="pr-1.5 pb-1.5">
          <button
            onClick={handleSend}
            disabled={!input.trim() || disabled}
            className={`p-2.5 rounded-full flex-shrink-0 transition-all duration-300 ${
              !input.trim() || disabled
                ? 'bg-white/5 text-white/20 cursor-not-allowed'
                : 'bg-white text-black hover:bg-indigo-50 shadow-[0_0_15px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95'
            }`}
          >
            <SendHorizontal size={18} className={!input.trim() ? "" : "ml-0.5"} />
          </button>
        </div>
      </div>
    </div>
  );
};