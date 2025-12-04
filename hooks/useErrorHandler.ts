/**
 * Хук для централизованной обработки ошибок
 */

import { useCallback } from 'react';
import { getErrorMessage, translateErrorMessage } from '../utils/errorHandling';
import { UseErrorHandlerReturn } from './types';

/**
 * Хук для обработки ошибок приложения
 * 
 * Предоставляет централизованные методы для:
 * - Извлечения сообщений об ошибках из различных форматов
 * - Трансляции технических сообщений в понятные пользователю
 * - Логирования ошибок (только в dev режиме)
 */
export const useErrorHandler = (): UseErrorHandlerReturn => {
  /**
   * Обрабатывает ошибку: извлекает сообщение, логирует и возвращает переведенное сообщение
   */
  const handleError = useCallback((error: unknown, context?: string): void => {
    const message = getErrorMessage(error);
    const translatedMessage = translateErrorMessage(message);
    
    // Логируем только в dev режиме
    if (import.meta.env.DEV) {
      const contextStr = context ? `[${context}] ` : '';
      console.error(`${contextStr}Error:`, error);
      console.error(`${contextStr}Translated message:`, translatedMessage);
    }
  }, []);

  /**
   * Извлекает сообщение об ошибке из различных форматов
   */
  const getErrorMessageWrapper = useCallback((error: unknown): string => {
    return getErrorMessage(error);
  }, []);

  /**
   * Транслирует техническое сообщение об ошибке в понятное пользователю
   */
  const translateErrorMessageWrapper = useCallback((message: string): string => {
    return translateErrorMessage(message);
  }, []);

  return {
    handleError,
    getErrorMessage: getErrorMessageWrapper,
    translateErrorMessage: translateErrorMessageWrapper,
  };
};

