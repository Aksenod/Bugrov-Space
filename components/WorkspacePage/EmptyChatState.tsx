/**
 * Компонент пустого состояния чата
 */

import React from 'react';
import { Bot } from 'lucide-react';
import { InlineHint } from '../InlineHint';
import { Agent } from '../../types';

interface EmptyChatStateProps {
  activeAgent: Agent | undefined;
  onSendMessage: (text: string) => Promise<void>;
}

export const EmptyChatState: React.FC<EmptyChatStateProps> = ({ activeAgent, onSendMessage }) => {
  // Логирование для диагностики quickMessages
  React.useEffect(() => {
    if (import.meta.env.DEV && activeAgent) {
      console.log('[EmptyChatState] Active agent:', {
        id: activeAgent.id,
        name: activeAgent.name,
        quickMessages: activeAgent.quickMessages,
        hasQuickMessages: activeAgent.quickMessages && activeAgent.quickMessages.length > 0,
        quickMessagesLength: activeAgent.quickMessages?.length || 0
      });
    }
  }, [activeAgent?.id, activeAgent?.quickMessages]);

  const handleExampleClick = async (example: string) => {
    if (!example || !example.trim()) {
      console.warn('[EmptyChatState] Empty example text, cannot send');
      return;
    }

    if (import.meta.env.DEV) {
      console.log('[EmptyChatState] Sending example message:', example);
    }

    try {
      await onSendMessage(example);
      if (import.meta.env.DEV) {
        console.log('[EmptyChatState] Example message sent successfully');
      }
    } catch (error) {
      // Ошибка уже обработана в handleSendMessage
      console.error('[EmptyChatState] Failed to send example message:', error);
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40 pointer-events-none px-4">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full animate-pulse"></div>
        <Bot size={64} className="relative opacity-40" />
      </div>
      <p className="text-base font-semibold text-white/60 mb-2">
        Начните диалог с {activeAgent?.name || 'агентом'}
      </p>
      <p className="text-sm text-white/40 text-center max-w-md mb-4">
        Задайте вопрос или попросите помочь с задачей
      </p>

      {/* Примеры вопросов - показываем только если есть подсказки у агента */}
      {activeAgent?.quickMessages && activeAgent.quickMessages.length > 0 && (
        <div className="max-w-md mx-auto pointer-events-auto">
          <InlineHint
            title="Что написать агенту"
            description="Вы можете задавать любые вопросы агенту. Агент использует документы проекта для контекста, поэтому загрузите файлы, чтобы получить более точные ответы."
            examples={activeAgent.quickMessages.filter(msg => msg.trim())}
            variant="info"
            collapsible={false}
            dismissible={false}
            onExampleClick={handleExampleClick}
          />
        </div>
      )}
    </div>
  );
};

