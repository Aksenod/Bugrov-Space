/**
 * Сервис для работы с документами
 */

import { ApiFile } from './api';
import { request } from './apiHelpers';

/**
 * Получение файлов агента
 */
export const getAgentFiles = async (agentId: string) => {
  return request<{ files: ApiFile[] }>(`/agents/${agentId}/files`);
};

/**
 * Получение файлов саммари проекта
 */
export const getSummaryFiles = async (agentId: string, projectId?: string) => {
  const query = projectId ? `?projectId=${projectId}` : '';
  return request<{ files: ApiFile[] }>(`/agents/${agentId}/files/summary${query}`);
};

/**
 * Генерация саммари
 */
export const generateSummary = async (agentId: string, projectId?: string) => {
  const query = projectId ? `?projectId=${projectId}` : '';
  return request<{ file: ApiFile }>(`/agents/${agentId}/summary${query}`, { method: 'POST' });
};

/**
 * Генерация прототипа
 */
export const generatePrototype = async (agentId: string, fileId: string) => {
  return request<{ file: ApiFile }>(`/agents/${agentId}/files/${fileId}/generate-prototype`, {
    method: 'POST',
  });
};

/**
 * Получение версий прототипа
 */
export const getPrototypeVersions = async (fileId: string) => {
  return request<{
    versions: Array<{
      id: string;
      versionNumber: number;
      createdAt: string;
      dslContent?: string;
      verstkaContent?: string;
    }>;
  }>(`/agents/files/${fileId}/prototype-versions`);
};

/**
 * Удаление версии прототипа
 */
export const deletePrototypeVersion = async (fileId: string, versionNumber: number) => {
  return request<{ success: boolean }>(
    `/agents/files/${fileId}/prototype-versions/${versionNumber}`,
    {
      method: 'DELETE',
    }
  );
};

/**
 * Удаление файла по ID
 */
export const deleteFileById = async (fileId: string) => {
  return request<void>(`/files/${fileId}`, { method: 'DELETE' });
};

/**
 * Загрузка файла в проект
 */
export const uploadProjectFile = async (projectId: string, payload: {
  name: string;
  mimeType: string;
  content: string;
}) => {
  return request<{ file: ApiFile }>(`/projects/${projectId}/files`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

/**
 * Удаление файла проекта
 */
export const deleteProjectFile = async (projectId: string, fileId: string) => {
  return request<void>(`/projects/${projectId}/files/${fileId}`, { method: 'DELETE' });
};

