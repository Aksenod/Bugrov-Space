/**
 * Сервис для работы с проектами
 */

import { ApiProject, ApiFile } from './api';
import { request } from './apiHelpers';

/**
 * Получение всех проектов пользователя
 */
export const getProjects = async () => {
  return request<{ projects: ApiProject[] }>('/projects');
};

/**
 * Получение проекта по ID
 */
export const getProject = async (projectId: string) => {
  return request<{ project: ApiProject }>(`/projects/${projectId}`);
};

/**
 * Создание нового проекта
 */
export const createProject = async (payload: {
  name: string;
  description?: string;
  projectTypeName?: string;
  projectTypeId?: string;
}) => {
  return request<{ project: ApiProject }>('/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

/**
 * Обновление проекта
 */
export const updateProject = async (projectId: string, payload: { name?: string; description?: string }) => {
  return request<{ project: ApiProject }>(`/projects/${projectId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
};

/**
 * Удаление проекта
 */
export const deleteProject = async (projectId: string) => {
  return request<void>(`/projects/${projectId}`, { method: 'DELETE' });
};

/**
 * Получение файлов проекта
 */
export const getProjectFiles = async (projectId: string) => {
  return request<{ files: ApiFile[] }>(`/projects/${projectId}/files`);
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

