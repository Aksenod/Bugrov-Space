import React, { useRef, useEffect } from 'react';
import { X, Loader2, Sparkles, MousePointer2 } from 'lucide-react';
import { SelectedSection } from '../../utils/sectionEditHelpers';

interface SectionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSection: SelectedSection | null;
  editPrompt: string;
  onEditPromptChange: (value: string) => void;
  isProcessing: boolean;
  onApply: () => void;
}

export const SectionEditModal: React.FC<SectionEditModalProps> = ({
  isOpen,
  onClose,
  selectedSection,
  editPrompt,
  onEditPromptChange,
  isProcessing,
  onApply,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Фокус на textarea при открытии
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Обработка Enter для отправки (Shift+Enter для новой строки)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && editPrompt.trim() && !isProcessing) {
      e.preventDefault();
      onApply();
    }
  };

  if (!isOpen || !selectedSection) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-gradient-to-br from-gray-900 via-gray-900 to-indigo-950/50 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <MousePointer2 size={20} className="text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Редактирование секции</h3>
              <p className="text-sm text-white/50">
                Элемент: <code className="px-1.5 py-0.5 bg-white/10 rounded text-indigo-300">&lt;{selectedSection.tagName}&gt;</code>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Preview */}
        <div className="p-4 border-b border-white/10">
          <p className="text-sm text-white/50 mb-2">Выбранная секция:</p>
          <div className="bg-black/40 border border-white/10 rounded-xl p-4 max-h-48 overflow-auto">
            <div
              className="text-sm text-white/80 prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: selectedSection.innerHtml }}
            />
          </div>
        </div>

        {/* Prompt input */}
        <div className="p-4">
          <label className="block text-sm font-medium text-white/70 mb-2">
            Как изменить эту секцию?
          </label>
          <textarea
            ref={textareaRef}
            value={editPrompt}
            onChange={(e) => onEditPromptChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Например: Сделай текст более продающим, добавь призыв к действию..."
            className="w-full h-32 bg-black/40 text-white placeholder-white/30 border border-white/10 rounded-xl p-4 resize-none focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            disabled={isProcessing}
          />
          <p className="text-xs text-white/40 mt-2">
            Нажмите Enter для применения, Shift+Enter для новой строки
          </p>
        </div>

        {/* Quick prompts */}
        <div className="px-4 pb-4">
          <p className="text-xs text-white/40 mb-2">Быстрые действия:</p>
          <div className="flex flex-wrap gap-2">
            {[
              'Сделай текст короче',
              'Добавь призыв к действию',
              'Измени стиль на более формальный',
              'Сделай более продающим',
            ].map((prompt) => (
              <button
                key={prompt}
                onClick={() => onEditPromptChange(prompt)}
                disabled={isProcessing}
                className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/60 hover:text-white transition-colors disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-white/10 bg-black/20">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={onApply}
            disabled={isProcessing || !editPrompt.trim()}
            className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-indigo-500/25"
          >
            {isProcessing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Применение...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Применить изменения</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
