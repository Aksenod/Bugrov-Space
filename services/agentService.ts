/**
 * Сервис для работы с агентами
 */

import { ApiAgent, ApiProjectTypeAgent } from './api';
import { request } from './apiHelpers';

/**
 * Получение агентов проекта
 */
export const getAgents = async (projectId: string) => {
  if (!projectId || projectId.trim() === '') {
    throw new Error('projectId обязателен');
  }
  return request<{ agents: ApiAgent[]; projectTypeAgents?: ApiProjectTypeAgent[] }>(
    `/agents?projectId=${encodeURIComponent(projectId)}`
  );
};

