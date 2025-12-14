/**
 * Контекст для bootstrap логики (загрузка данных при старте приложения)
 */

import React, { createContext, useContext, useCallback, useRef, useState, ReactNode } from 'react';
import { getToken } from '../services/apiHelpers';
import { useAuthContext } from './AuthContext';
import { useProjectContext } from './ProjectContext';
import { useAgentContext } from './AgentContext';
import { useChatContext } from './ChatContext';
import { UseBootstrapReturn } from '../hooks/types';

interface BootstrapContextValue extends UseBootstrapReturn {}

const BootstrapContext = createContext<BootstrapContextValue | undefined>(undefined);

interface BootstrapProviderProps {
  children: ReactNode;
  onError?: (error: any) => void;
}

export const BootstrapProvider: React.FC<BootstrapProviderProps> = ({ children, onError }) => {
  const auth = useAuthContext();
  const projects = useProjectContext();
  const agents = useAgentContext();
  const chat = useChatContext();

  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const bootstrapInProgressRef = useRef(false);
  const lastBootstrapTokenRef = useRef<string | null>(null);
  const hasBootstrappedRef = useRef(false);

  const bootstrap = useCallback(async (): Promise<void> => {
    // Читаем токен несколько раз, чтобы убедиться, что он синхронизирован
    let token = getToken();
    if (!token) {
      // Даем еще одну попытку после небольшой задержки
      await new Promise(resolve => setTimeout(resolve, 50));
      token = getToken();
    }
    
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
      return;
    }

    // Если bootstrap уже был выполнен с тем же токеном, пропускаем
    if (lastBootstrapTokenRef.current === token && hasBootstrappedRef.current) {
      return;
    }

    bootstrapInProgressRef.current = true;
    lastBootstrapTokenRef.current = token;
    setIsBootstrapping(true);

    try {
      // Загружаем пользователя
      await auth.loadUser();

      // Загружаем проекты и типы проектов
      const [selectedProjectId] = await Promise.all([
        projects.loadProjects(),
        projects.loadProjectTypes(),
      ]);

      // Загружаем агентов выбранного проекта
      // Используем возвращаемое значение из loadProjects вместо состояния,
      // так как состояние React обновляется асинхронно
      if (selectedProjectId && selectedProjectId.trim() !== '') {
        try {
          await agents.loadAgents(selectedProjectId);
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

  const value: BootstrapContextValue = {
    isBootstrapping,
    bootstrap,
    hasBootstrapped: hasBootstrappedRef.current,
    reset,
  };

  return (
    <BootstrapContext.Provider value={value}>
      {children}
    </BootstrapContext.Provider>
  );
};

export const useBootstrapContext = (): BootstrapContextValue => {
  const context = useContext(BootstrapContext);
  if (!context) {
    throw new Error('useBootstrapContext must be used within BootstrapProvider');
  }
  return context;
};

