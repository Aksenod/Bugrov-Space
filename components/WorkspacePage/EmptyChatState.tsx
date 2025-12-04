/**
 * Компонент пустого состояния чата
 */

import React from 'react';
import { Bot } from 'lucide-react';
import { InlineHint } from '../InlineHint';
import { useOnboarding } from '../OnboardingContext';
import { Agent } from '../../types';

interface EmptyChatStateProps {
  activeAgent: Agent | undefined;
}

export const EmptyChatState: React.FC<EmptyChatStateProps> = ({ activeAgent }) => {
  const { shouldShowStep, completeStep } = useOnboarding();

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

      {/* Примеры вопросов */}
      {shouldShowStep({
        id: 'empty-chat-hint',
        component: 'inline',
        content: {
          title: 'Что написать агенту',
          description: 'Вы можете задавать любые вопросы агенту. Агент использует документы проекта для контекста, поэтому загрузите файлы, чтобы получить более точные ответы.',
        },
        showOnce: true,
      }) && (
        <div className="max-w-md mx-auto pointer-events-auto">
          <InlineHint
            title="Что написать агенту"
            description="Вы можете задавать любые вопросы агенту. Агент использует документы проекта для контекста, поэтому загрузите файлы, чтобы получить более точные ответы."
            examples={[
              'Привет, расскажи что ты умеешь',
            ]}
            variant="info"
            collapsible={true}
            defaultExpanded={false}
            dismissible={true}
            onDismiss={() => completeStep('empty-chat-hint')}
          />
        </div>
      )}
    </div>
  );
};

