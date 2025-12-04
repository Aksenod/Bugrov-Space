/**
 * Сервис для работы с аутентификацией
 */

import { ApiUser } from './api';
import { request } from './apiHelpers';

/**
 * Регистрация нового пользователя
 */
export const register = async (payload: { username: string; password: string }) => {
  return request<{ token: string; user: ApiUser }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

/**
 * Вход в систему
 */
export const login = async (payload: { username: string; password: string }) => {
  return request<{ token: string; user: ApiUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

/**
 * Сброс пароля
 */
export const resetPassword = async (payload: { username: string; newPassword: string }) => {
  return request<{ success: boolean }>('/auth/reset', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

/**
 * Получение текущего пользователя
 */
export const getCurrentUser = async () => {
  return request<{ user: ApiUser }>('/auth/me');
};

