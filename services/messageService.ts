/**
 * Сервис для работы с сообщениями
 */

import { ApiMessage } from './api';
import { request } from './apiHelpers';

/**
 * Получение сообщений агента
 */
export const getMessages = async (agentId: string, projectId?: string) => {
  const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
  return request<{ messages: ApiMessage[] }>(`/agents/${agentId}/messages${query}`);
};

/**
 * Отправка сообщения агенту
 */
export const sendMessage = async (agentId: string, text: string, projectId?: string) => {
  return request<{ messages: ApiMessage[]; agentId?: string; templateId?: string }>(
    `/agents/${agentId}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({ text, projectId }),
    }
  );
};

/**
 * Очистка сообщений агента
 */
export const clearMessages = async (agentId: string, projectId?: string) => {
  const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
  return request<void>(`/agents/${agentId}/messages${query}`, { method: 'DELETE' });
};

