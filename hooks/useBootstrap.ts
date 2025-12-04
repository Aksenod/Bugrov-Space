/**
 * Хук для bootstrap логики (загрузка данных при старте приложения)
 */

import { useCallback, useRef, useState } from 'react';
import { api } from '../services/api';
import { UseBootstrapReturn, UseAuthReturn, UseProjectsReturn, UseAgentsReturn, UseChatReturn } from './types';

/**
 * Хук для bootstrap логики
 * 
 * Предоставляет методы для:
 * - Загрузки всех данных при старте приложения (bootstrap)
 * - Управления состоянием загрузки
 */
export const useBootstrap = (
  auth: UseAuthReturn,
  projects: UseProjectsReturn,
  agents: UseAgentsReturn,
  chat: UseChatReturn,
  onError?: (error: any) => void
): UseBootstrapReturn => {
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const bootstrapInProgressRef = useRef(false);
  const lastBootstrapTokenRef = useRef<string | null>(null);
  const hasBootstrappedRef = useRef(false);

  const bootstrap = useCallback(async (): Promise<void> => {
    const token = api.getToken();
    if (!token) {
      auth.logout();
      projects.setProjects([]);
      projects.selectProject(null);
      lastBootstrapTokenRef.current = null;
      hasBootstrappedRef.current = false;
      return;
    }

    // Предотвращаем параллельные вызовы bootstrap
    if (bootstrapInProgressRef.current) {
      if (import.meta.env.DEV) {
        console.log('[Bootstrap] Already in progress, skipping...');
      }
      return;
    }

    // Если bootstrap уже был выполнен с тем же токеном, пропускаем
    if (lastBootstrapTokenRef.current === token && hasBootstrappedRef.current) {
      if (import.meta.env.DEV) {
        console.log('[Bootstrap] Already bootstrapped with this token, skipping...');
      }
      return;
    }

    bootstrapInProgressRef.current = true;
    lastBootstrapTokenRef.current = token;
    setIsBootstrapping(true);

    try {
      // Загружаем пользователя
      await auth.loadUser();

      // Загружаем проекты и типы проектов
      await Promise.all([
        projects.loadProjects(),
        projects.loadProjectTypes(),
      ]);

      // Загружаем агентов выбранного проекта
      if (projects.activeProjectId && projects.activeProjectId.trim() !== '') {
        try {
          await agents.loadAgents(projects.activeProjectId);
        } catch (error) {
          console.error('Failed to load agents in bootstrap', error);
          agents.setAgents([]);
          agents.setActiveAgentId(null);
        }
      } else {
        agents.setAgents([]);
        agents.setActiveAgentId(null);
      }

      // Очищаем историю чата и документы
      chat.clearAllChatHistories();
      chat.clearLoadedAgents();
      hasBootstrappedRef.current = true;
    } catch (error: any) {
      console.error('Bootstrap failed', error);

      // Проверяем тип ошибки
      const isAuthError = error?.status === 401 || error?.status === 403;
      const isDbError = error?.status === 503 || error?.status === 500 ||
        error?.message?.includes('Database') ||
        error?.message?.includes('Can\'t reach database');
      const isRateLimitError = error?.status === 429;

      // Если ошибка авторизации - выкидываем пользователя
      if (isAuthError) {
        auth.logout();
        projects.setProjects([]);
        projects.selectProject(null);
        lastBootstrapTokenRef.current = null;
        hasBootstrappedRef.current = false;
      } else if (isDbError || isRateLimitError) {
        // Если ошибка базы данных или rate limit - оставляем пользователя залогиненным
        if (isRateLimitError && onError) {
          const errorMessage = error?.message || 'Превышен лимит запросов. Пожалуйста, подождите минуту и обновите страницу.';
          onError({ message: errorMessage, type: 'rateLimit' });
        }
        // Не очищаем данные, если они уже были загружены
        if (!auth.user && projects.projects.length === 0) {
          projects.setProjects([]);
          agents.setAgents([]);
          agents.setActiveAgentId(null);
          chat.clearAllChatHistories();
          chat.clearLoadedAgents();
        }
      } else {
        // Для других ошибок - также оставляем пользователя залогиненным
        if (!auth.user && projects.projects.length === 0) {
          projects.setProjects([]);
          agents.setAgents([]);
          agents.setActiveAgentId(null);
          chat.clearAllChatHistories();
          chat.clearLoadedAgents();
        }
      }

      if (onError) {
        onError(error);
      }
    } finally {
      setIsBootstrapping(false);
      bootstrapInProgressRef.current = false;
    }
  }, [auth, projects, agents, chat, onError]);

  const reset = useCallback(() => {
    lastBootstrapTokenRef.current = null;
    hasBootstrappedRef.current = false;
    bootstrapInProgressRef.current = false;
    setIsBootstrapping(false);
  }, []);

  return {
    isBootstrapping,
    bootstrap,
    hasBootstrapped: hasBootstrappedRef.current,
    reset,
  };
};

