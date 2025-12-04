import { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../services/api';

const GLOBAL_PROMPT_LIMIT = 5000;

export const useGlobalPrompt = (showAlert: (message: string, title?: string, variant?: 'success' | 'error' | 'info' | 'warning', duration?: number) => void) => {
  const [globalPrompt, setGlobalPrompt] = useState('');
  const [initialGlobalPrompt, setInitialGlobalPrompt] = useState('');
  const [isLoadingGlobalPrompt, setIsLoadingGlobalPrompt] = useState(false);
  const [isSavingGlobalPrompt, setIsSavingGlobalPrompt] = useState(false);
  const [globalPromptUpdatedAt, setGlobalPromptUpdatedAt] = useState<string | null>(null);
  const [globalPromptError, setGlobalPromptError] = useState<string | null>(null);

  const globalPromptHasChanges = useMemo(
    () => globalPrompt !== initialGlobalPrompt,
    [globalPrompt, initialGlobalPrompt],
  );

  const formattedGlobalPromptUpdatedAt = useMemo(() => {
    if (!globalPromptUpdatedAt) {
      return null;
    }
    try {
      return new Date(globalPromptUpdatedAt).toLocaleString('ru-RU');
    } catch {
      return globalPromptUpdatedAt;
    }
  }, [globalPromptUpdatedAt]);

  const loadGlobalPrompt = useCallback(async () => {
    setIsLoadingGlobalPrompt(true);
    setGlobalPromptError(null);
    try {
      const { globalPrompt: prompt } = await api.getGlobalPrompt();
      const content = prompt?.content ?? '';
      setGlobalPrompt(content);
      setInitialGlobalPrompt(content);
      setGlobalPromptUpdatedAt(prompt?.updatedAt ?? prompt?.createdAt ?? null);
    } catch (error: any) {
      if (error?.status === 404) {
        console.warn('Global prompt endpoint not found (404), initializing with empty content');
        setGlobalPrompt('');
        setInitialGlobalPrompt('');
        setGlobalPromptUpdatedAt(null);
      } else {
        console.error('Failed to load global prompt', error);
        setGlobalPromptError(error?.message || 'Не удалось загрузить глобальный промт');
      }
    } finally {
      setIsLoadingGlobalPrompt(false);
    }
  }, []);

  const handleSaveGlobalPrompt = async () => {
    if (isSavingGlobalPrompt || isLoadingGlobalPrompt || !globalPromptHasChanges) {
      return;
    }
    setIsSavingGlobalPrompt(true);
    setGlobalPromptError(null);
    try {
      const { globalPrompt: prompt } = await api.updateGlobalPrompt({
        content: globalPrompt,
      });
      const content = prompt?.content ?? '';
      setGlobalPrompt(content);
      setInitialGlobalPrompt(content);
      setGlobalPromptUpdatedAt(prompt?.updatedAt ?? prompt?.createdAt ?? null);
      showAlert(
        'Глобальный промт обновлён и будет применяться ко всем агентам',
        'Готово',
        'success',
        3000,
      );
    } catch (error: any) {
      let message = error?.message || 'Не удалось сохранить глобальный промт';
      if (error?.status === 404) {
        message = 'Функция глобального промта не доступна на сервере (404). Возможно, требуется обновление сервера.';
      }
      setGlobalPromptError(message);
      showAlert(message, 'Ошибка', 'error', 4000);
    } finally {
      setIsSavingGlobalPrompt(false);
    }
  };

  return {
    globalPrompt,
    setGlobalPrompt,
    initialGlobalPrompt,
    isLoadingGlobalPrompt,
    isSavingGlobalPrompt,
    globalPromptUpdatedAt,
    globalPromptError,
    setGlobalPromptError,
    globalPromptHasChanges,
    formattedGlobalPromptUpdatedAt,
    GLOBAL_PROMPT_LIMIT,
    loadGlobalPrompt,
    handleSaveGlobalPrompt,
  };
};

