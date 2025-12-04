/**
 * Хук для управления авторизацией пользователя
 */

import { useState, useCallback } from 'react';
import { login as loginService, register as registerService, resetPassword as resetPasswordService, getCurrentUser as getCurrentUserService, setToken, getToken, clearToken } from '../services';
import { mapUser } from '../utils/mappers';
import { getErrorMessage, translateErrorMessage } from '../utils/errorHandling';
import { UseAuthReturn } from './types';
import { User } from '../types';

/**
 * Хук для управления авторизацией
 * 
 * Предоставляет методы для:
 * - Входа в систему (login)
 * - Регистрации (register)
 * - Выхода из системы (logout)
 * - Сброса пароля (resetPassword)
 * - Управления состоянием авторизации
 */
export const useAuth = (): UseAuthReturn => {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Вход в систему
   */
  const login = useCallback(async (username: string, password: string): Promise<void> => {
    setAuthError(null);
    setIsLoading(true);
    
    const payload = {
      username: username.trim().toLowerCase(),
      password: password.trim(),
    };
    
    try {
      const response = await loginService(payload);
      setToken(response.token);
      setTokenState(response.token);
      setUser(mapUser(response.user));
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      const translatedMessage = translateErrorMessage(errorMessage);
      setAuthError(translatedMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Регистрация нового пользователя
   */
  const register = useCallback(async (username: string, password: string): Promise<void> => {
    setAuthError(null);
    setIsLoading(true);
    
    try {
      const response = await registerService({
        username: username.trim().toLowerCase(),
        password: password.trim(),
      });
      setToken(response.token);
      setTokenState(response.token);
      setUser(mapUser(response.user));
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      const translatedMessage = translateErrorMessage(errorMessage);
      setAuthError(translatedMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Выход из системы
   */
  const logout = useCallback((): void => {
    clearToken();
    setTokenState(null);
    setUser(null);
    setAuthError(null);
  }, []);

  /**
   * Сброс пароля
   */
  const resetPassword = useCallback(async (username: string, newPassword: string): Promise<void> => {
    setAuthError(null);
    setIsLoading(true);
    
    try {
      await resetPasswordService({
        username: username.trim().toLowerCase(),
        newPassword: newPassword.trim(),
      });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      const translatedMessage = translateErrorMessage(errorMessage);
      setAuthError(translatedMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Очистка ошибки авторизации
   */
  const clearError = useCallback((): void => {
    setAuthError(null);
  }, []);

  /**
   * Загружает текущего пользователя (для использования в bootstrap)
   */
  const loadUser = useCallback(async (): Promise<void> => {
    try {
      const { user } = await getCurrentUserService();
      setUser(mapUser(user));
    } catch (error) {
      // Если не удалось загрузить пользователя, очищаем состояние
      setUser(null);
      throw error;
    }
  }, []);

  return {
    token: token,
    user,
    authError,
    isLoading,
    login,
    register,
    logout,
    resetPassword,
    clearError,
    // Внутренний метод для bootstrap
    loadUser,
  };
};

