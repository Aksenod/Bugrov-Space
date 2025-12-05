/**
 * Хук для управления агентами
 */

import { useState, useCallback, useMemo } from 'react';
import { getAgents as getAgentsService } from '../services/agentService';
import { mapAgent } from '../utils/mappers';
import { sortAgents } from '../utils/helpers';
import { UseAgentsReturn } from './types';
import { Agent } from '../types';

/**
 * Хук для управления агентами проекта
 * 
 * Предоставляет методы для:
 * - Загрузки агентов проекта (reloadAgents)
 * - Выбора активного агента (selectAgent)
 * - Получения агента по ID (getAgent)
 * - Вычисления активного агента (activeAgent)
 */
export const useAgents = (activeProjectId: string | null): UseAgentsReturn => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Вычисляет активного агента на основе activeAgentId
   */
  const activeAgent = useMemo((): Agent | undefined => {
    if (!agents.length) {
      return undefined;
    }
    if (!activeAgentId) {
      return agents[0];
    }
    return agents.find((agent) => agent.id === activeAgentId) ?? agents[0];
  }, [activeAgentId, agents]);

  /**
   * Получает агента по ID
   */
  const getAgent = useCallback((agentId: string): Agent | undefined => {
    return agents.find(agent => agent.id === agentId);
  }, [agents]);

  /**
   * Загружает агентов проекта
   */
  const loadAgents = useCallback(async (projectId: string): Promise<void> => {
    if (!projectId || projectId.trim() === '') {
      setAgents([]);
      setActiveAgentId(null);
      return;
    }

    setIsLoading(true);
    try {
      const response = await getAgentsService(projectId);
      const { agents: apiAgents, projectTypeAgents } = response;
      
      // Логирование для диагностики quickMessages
      if (import.meta.env.DEV) {
        console.log('[useAgents] API response:', {
          agentsCount: apiAgents?.length || 0,
          projectTypeAgentsCount: projectTypeAgents?.length || 0,
          agentsWithQuickMessages: apiAgents?.filter(a => a.quickMessages && a.quickMessages.length > 0).map(a => ({
            id: a.id,
            name: a.name,
            quickMessages: a.quickMessages
          })) || [],
          projectTypeAgentsWithQuickMessages: projectTypeAgents?.filter(a => a.quickMessages && a.quickMessages.length > 0).map(a => ({
            id: a.id,
            name: a.name,
            quickMessages: a.quickMessages
          })) || []
        });
      }
      
      const mappedAgents = sortAgents(apiAgents.map(mapAgent));
      setAgents(mappedAgents);

      // Выбираем активного агента
      setActiveAgentId((prev) => {
        if (prev && mappedAgents.some((agent) => agent.id === prev)) {
          return prev;
        }
        return mappedAgents[0]?.id ?? null;
      });
    } catch (error) {
      console.error('Failed to load agents', error);
      setAgents([]);
      setActiveAgentId(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Перезагружает агентов текущего проекта
   */
  const reloadAgents = useCallback(async (): Promise<void> => {
    if (!activeProjectId) {
      setAgents([]);
      setActiveAgentId(null);
      return;
    }
    await loadAgents(activeProjectId);
  }, [activeProjectId, loadAgents]);

  /**
   * Выбирает активного агента
   */
  const selectAgent = useCallback((agentId: string): void => {
    if (agents.some(agent => agent.id === agentId)) {
      setActiveAgentId(agentId);
    }
  }, [agents]);

  // Автоматически загружаем агентов при изменении activeProjectId
  // Это будет обрабатываться в bootstrap, но оставляем для совместимости

  return {
    agents,
    activeAgentId,
    isLoading,
    activeAgent,
    reloadAgents,
    selectAgent,
    getAgent,
    // Внутренние методы для использования в bootstrap
    loadAgents,
    setAgents,
    setActiveAgentId,
  };
};

