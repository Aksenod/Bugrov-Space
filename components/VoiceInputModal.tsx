import React from 'react';
import { Mic, Check, X, Sparkles } from 'lucide-react';

interface VoiceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  correctedText: string;
  onUseCorrected: () => void;
  onUseOriginal: () => void;
}

/**
 * Вычисляет различия между двумя текстами для визуального сравнения
 */
function getTextDiff(original: string, corrected: string): Array<{ text: string; type: 'same' | 'changed' }> {
  if (original === corrected) {
    return [{ text: original, type: 'same' as const }];
  }

  // Простой алгоритм сравнения: разбиваем на слова и сравниваем
  const originalWords = original.split(/(\s+)/);
  const correctedWords = corrected.split(/(\s+)/);
  
  const result: Array<{ text: string; type: 'same' | 'changed' }> = [];
  let origIdx = 0;
  let corrIdx = 0;

  while (origIdx < originalWords.length || corrIdx < correctedWords.length) {
    if (origIdx >= originalWords.length) {
      // Остались только слова из исправленного текста
      result.push({ text: correctedWords.slice(corrIdx).join(''), type: 'changed' });
      break;
    }
    
    if (corrIdx >= correctedWords.length) {
      // Остались только слова из оригинального текста
      result.push({ text: originalWords.slice(origIdx).join(''), type: 'changed' });
      break;
    }

    if (originalWords[origIdx] === correctedWords[corrIdx]) {
      result.push({ text: originalWords[origIdx], type: 'same' });
      origIdx++;
      corrIdx++;
    } else {
      // Находим следующее совпадение
      let found = false;
      for (let i = corrIdx + 1; i < correctedWords.length; i++) {
        if (originalWords[origIdx] === correctedWords[i]) {
          // Добавляем все слова до совпадения как измененные
          result.push({ 
            text: correctedWords.slice(corrIdx, i).join(''), 
            type: 'changed' 
          });
          corrIdx = i;
          found = true;
          break;
        }
      }
      
      if (!found) {
        result.push({ text: originalWords[origIdx], type: 'changed' });
        origIdx++;
      }
    }
  }

  return result;
}

export const VoiceInputModal: React.FC<VoiceInputModalProps> = ({
  isOpen,
  onClose,
  originalText,
  correctedText,
  onUseCorrected,
  onUseOriginal,
}) => {
  if (!isOpen) return null;

  const hasChanges = originalText !== correctedText;
  const diff = hasChanges ? getTextDiff(originalText, correctedText) : null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleUseCorrected = () => {
    onUseCorrected();
    onClose();
  };

  const handleUseOriginal = () => {
    onUseOriginal();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in duration-300" />

      {/* Dialog */}
      <div className="relative w-full max-w-2xl bg-gradient-to-br from-black/90 via-black/80 to-black/90 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] shadow-indigo-500/10 animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
        {/* Decorative gradient overlay */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500/50 via-purple-500/30 to-transparent" />

        {/* Content */}
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl flex-shrink-0">
              <Mic size={24} className="text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-white mb-1">Голосовой ввод</h3>
              <p className="text-sm text-white/60">
                {hasChanges 
                  ? 'Текст был распознан и исправлен. Выберите, какой вариант использовать.'
                  : 'Текст распознан. Проверьте и при необходимости отредактируйте.'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors flex-shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          {/* Original Text */}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-white/60 uppercase tracking-wide">Оригинальный текст</span>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
              <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                {originalText}
              </p>
            </div>
          </div>

          {/* Corrected Text */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-indigo-400" />
              <span className="text-xs font-medium text-white/60 uppercase tracking-wide">
                Исправленный текст {hasChanges && <span className="text-indigo-400">(изменения выделены)</span>}
              </span>
            </div>
            <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl">
              {hasChanges && diff ? (
                <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                  {diff.map((part, idx) => (
                    <span
                      key={idx}
                      className={part.type === 'changed' ? 'bg-indigo-500/20 text-indigo-200 rounded px-0.5' : ''}
                    >
                      {part.text}
                    </span>
                  ))}
                </p>
              ) : (
                <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">
                  {correctedText}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleUseOriginal}
              className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-medium text-sm transition-all active:scale-[0.98]"
            >
              Использовать оригинальный
            </button>
            <button
              onClick={handleUseCorrected}
              className="flex-1 px-4 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold text-sm transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Check size={16} />
              Использовать исправленный
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

