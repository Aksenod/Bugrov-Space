/**
 * Хук для управления диалогами (Confirm и Alert)
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { UseDialogsReturn } from './types';

/**
 * Хук для управления диалогами подтверждения и уведомлений
 * 
 * Предоставляет методы для:
 * - Показа диалога подтверждения (showConfirm)
 * - Показа уведомления (showAlert)
 * - Управления состоянием диалогов
 */
export const useDialogs = (): UseDialogsReturn => {
  const [confirmDialog, setConfirmDialog] = useState<UseDialogsReturn['confirmDialog']>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [alertDialog, setAlertDialog] = useState<UseDialogsReturn['alertDialog']>({
    isOpen: false,
    message: '',
    duration: 0,
  });

  // Храним таймеры для автоматического закрытия alert
  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Очищаем таймер при размонтировании
  useEffect(() => {
    return () => {
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Показывает диалог подтверждения
   */
  const showConfirm = useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    variant: 'danger' | 'warning' | 'info' = 'danger'
  ): void => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
      variant,
    });
  }, []);

  /**
   * Закрывает диалог подтверждения
   */
  const closeConfirm = useCallback((): void => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
  }, []);

  /**
   * Показывает уведомление
   */
  const showAlert = useCallback((
    message: string,
    title?: string,
    variant: 'success' | 'error' | 'info' | 'warning' = 'info',
    duration: number = 0
  ): void => {
    // Очищаем предыдущий таймер, если есть
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = null;
    }

    setAlertDialog({
      isOpen: true,
      message,
      title,
      variant,
      duration,
    });

    // Автоматически закрываем через указанное время
    if (duration > 0) {
      alertTimeoutRef.current = setTimeout(() => {
        setAlertDialog(prev => ({ ...prev, isOpen: false }));
        alertTimeoutRef.current = null;
      }, duration);
    }
  }, []);

  /**
   * Закрывает уведомление
   */
  const closeAlert = useCallback((): void => {
    // Очищаем таймер при ручном закрытии
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = null;
    }
    setAlertDialog(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    showConfirm,
    confirmDialog,
    closeConfirm,
    showAlert,
    alertDialog,
    closeAlert,
  };
};

