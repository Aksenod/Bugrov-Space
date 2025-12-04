/**
 * Компонент для пустых состояний (нет проектов, нет агентов)
 */

import React from 'react';
import { Bot } from 'lucide-react';
import { InlineHint } from './InlineHint';
import { useOnboarding } from './OnboardingContext';

interface EmptyStatePageProps {
  type: 'no-projects' | 'no-agents';
  onCreateProject?: () => void;
  onLogout?: () => void;
}

export const EmptyStatePage: React.FC<EmptyStatePageProps> = ({
  type,
  onCreateProject,
  onLogout,
}) => {
  const { shouldShowStep, completeStep } = useOnboarding();

  if (type === 'no-projects') {
    return (
      <div className="relative flex items-center justify-center h-full bg-black text-white px-4">
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="absolute top-4 right-4 px-4 py-2 rounded-full border border-white/20 text-sm font-semibold text-white/70 hover:text-white hover:border-white/40 hover:bg-white/5 transition-all focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-black"
          >
            Выйти
          </button>
        )}
        <div className="text-center space-y-6 max-w-2xl">
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full animate-pulse"></div>
            <Bot size={80} className="relative mx-auto animate-bot" />
          </div>
          <div>
            <p className="text-xl font-bold mb-2">Создайте первый проект</p>
            <p className="text-sm text-white/60 mb-4">Начните работу, создав ваш первый проект</p>
          </div>

          {/* Информационный блок о проектах */}
          {shouldShowStep({
            id: 'empty-projects-hint',
            component: 'inline',
            content: {
              title: 'Что такое проект?',
              description: 'Проект — это рабочее пространство для организации вашей работы с AI-агентами. В каждом проекте есть набор агентов, которые помогут вам с различными задачами. Выберите тип проекта, и система автоматически подберет подходящих агентов.',
            },
            showOnce: true,
          }) && (
            <div className="max-w-lg mx-auto">
              <InlineHint
                title="Что такое проект?"
                description="Проект — это рабочее пространство для организации вашей работы с AI-агентами. В каждом проекте есть набор агентов, которые помогут вам с различными задачами. Выберите тип проекта, и система автоматически подберет подходящих агентов."
                variant="info"
                collapsible={true}
                defaultExpanded={true}
                dismissible={true}
                onDismiss={() => completeStep('empty-projects-hint')}
              />
            </div>
          )}

          {onCreateProject && (
            <button
              id="create-project-button"
              className="px-6 py-3 bg-white text-black rounded-full font-bold hover:bg-indigo-50 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCreateProject();
              }}
              type="button"
            >
              Создать проект
            </button>
          )}
        </div>
      </div>
    );
  }

  // type === 'no-agents'
  return (
    <div className="flex-1 flex items-center justify-center bg-black text-white px-4">
      <div className="text-center space-y-6 max-w-2xl">
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full animate-pulse"></div>
          <Bot size={80} className="relative mx-auto animate-bot" />
        </div>
        <div>
          <p className="text-xl font-bold mb-2">Нет доступных агентов</p>
          <p className="text-sm text-white/60 mb-4">Агенты будут доступны после настройки проекта</p>
        </div>

        {/* Информационный блок об агентах */}
        {shouldShowStep({
          id: 'empty-agents-hint',
          component: 'inline',
          content: {
            title: 'Откуда берутся агенты?',
            description: 'Агенты автоматически создаются при создании проекта на основе выбранного типа проекта. Каждый тип проекта имеет свой набор специализированных агентов. Если агентов нет, возможно, выбранный тип проекта еще не настроен администратором.',
          },
          showOnce: true,
        }) && (
          <div className="max-w-lg mx-auto">
            <InlineHint
              title="Откуда берутся агенты?"
              description="Агенты автоматически создаются при создании проекта на основе выбранного типа проекта. Каждый тип проекта имеет свой набор специализированных агентов. Если агентов нет, возможно, выбранный тип проекта еще не настроен администратором."
              variant="info"
              collapsible={true}
              defaultExpanded={true}
              dismissible={true}
              onDismiss={() => completeStep('empty-agents-hint')}
            />
          </div>
        )}
      </div>
    </div>
  );
};

