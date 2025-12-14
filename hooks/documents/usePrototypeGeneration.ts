import { useState, useEffect, useRef } from 'react';
import { UploadedFile, Agent } from '../../types';
import { api } from '../../services/api';

interface UsePrototypeGenerationProps {
  selectedFile: UploadedFile | null;
  documentCreatorAgent: Agent | null | undefined;
  selectedFileId: string | null;
  onDocumentUpdate?: (file: UploadedFile) => void;
  onShowAlert?: (message: string, title?: string, variant?: 'success' | 'error' | 'info' | 'warning', duration?: number) => void;
  setActiveTab: (tab: 'text' | 'prototype') => void;
  setPrototypeVersions: (versions: any[]) => void;
  setSelectedVersionNumber: (version: number | null) => void;
}

const GENERATION_CHECK_INTERVAL = 5000; // Проверяем каждые 5 секунд
const GENERATION_TIMEOUT = 5 * 60 * 1000; // Максимум 5 минут на генерацию

const getGenerationKey = (fileId: string) => `prototype-generation-${fileId}`;

const saveGenerationState = (fileId: string, timestamp: number) => {
  try {
    localStorage.setItem(getGenerationKey(fileId), JSON.stringify({ fileId, timestamp }));
  } catch (error) {
    // Failed to save generation state - non-critical
  }
};

const getGenerationState = (fileId: string): { fileId: string; timestamp: number } | null => {
  try {
    const stored = localStorage.getItem(getGenerationKey(fileId));
    if (!stored) return null;
    const state = JSON.parse(stored);
    // Проверяем, не истек ли таймаут
    if (Date.now() - state.timestamp > GENERATION_TIMEOUT) {
      localStorage.removeItem(getGenerationKey(fileId));
      return null;
    }
    return state;
  } catch (error) {
    return null;
  }
};

const clearGenerationState = (fileId: string) => {
  try {
    localStorage.removeItem(getGenerationKey(fileId));
  } catch (error) {
    // Failed to clear generation state - non-critical
  }
};

export const usePrototypeGeneration = ({
  selectedFile,
  documentCreatorAgent,
  selectedFileId,
  onDocumentUpdate,
  onShowAlert,
  setActiveTab,
  setPrototypeVersions,
  setSelectedVersionNumber,
}: UsePrototypeGenerationProps) => {
  const [isGeneratingPrototype, setIsGeneratingPrototype] = useState(false);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousVersionsCountRef = useRef<number>(0);
  const isGeneratingRef = useRef<boolean>(false);
  
  // Сохраняем функции в ref для использования в замыканиях
  const callbacksRef = useRef({
    onDocumentUpdate,
    onShowAlert,
    setActiveTab,
    setPrototypeVersions,
    setSelectedVersionNumber,
    selectedFile,
  });
  
  // Обновляем ref при изменении пропсов
  useEffect(() => {
    callbacksRef.current = {
      onDocumentUpdate,
      onShowAlert,
      setActiveTab,
      setPrototypeVersions,
      setSelectedVersionNumber,
      selectedFile,
    };
  }, [onDocumentUpdate, onShowAlert, setActiveTab, setPrototypeVersions, setSelectedVersionNumber, selectedFile]);

  // Проверяем активные генерации при монтировании
  useEffect(() => {
    if (selectedFileId) {
      const state = getGenerationState(selectedFileId);
      if (state) {
        setIsGeneratingPrototype(true);
        isGeneratingRef.current = true;
        
        // Инициализируем количество версий перед началом проверки
        api.getPrototypeVersions(selectedFileId)
          .then(({ versions }) => {
            previousVersionsCountRef.current = versions.length;
            callbacksRef.current.setPrototypeVersions(versions);
            if (versions.length > 0) {
              callbacksRef.current.setSelectedVersionNumber(versions[0].versionNumber);
            }
            startVersionChecking();
          })
          .catch((error) => {
            console.error('Failed to initialize versions count:', error);
            previousVersionsCountRef.current = 0;
            startVersionChecking();
          });
      }
    }

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [selectedFileId]);

  const startVersionChecking = () => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
    }

    checkIntervalRef.current = setInterval(async () => {
      if (!selectedFileId || !isGeneratingRef.current) {
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = null;
        }
        return;
      }

      try {
        const { versions } = await api.getPrototypeVersions(selectedFileId);
        const currentVersionsCount = versions.length;

        // Если появилась новая версия, значит генерация завершилась
        if (currentVersionsCount > previousVersionsCountRef.current) {
          setIsGeneratingPrototype(false);
          isGeneratingRef.current = false;
          clearGenerationState(selectedFileId);
          
          if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
          }

          // Обновляем версии
          callbacksRef.current.setPrototypeVersions(versions);
          if (versions.length > 0) {
            callbacksRef.current.setSelectedVersionNumber(versions[0].versionNumber);
          }

          // Обновляем файл
          const currentSelectedFile = callbacksRef.current.selectedFile;
          if (currentSelectedFile && callbacksRef.current.onDocumentUpdate) {
            try {
              const { versions: latestVersions } = await api.getPrototypeVersions(selectedFileId);
              if (latestVersions.length > 0) {
                const latestVersion = latestVersions[0];
                const updatedFile: UploadedFile = {
                  ...currentSelectedFile,
                  dslContent: latestVersion.dslContent || undefined,
                  verstkaContent: latestVersion.verstkaContent || undefined,
                };
                callbacksRef.current.onDocumentUpdate(updatedFile);
              }
            } catch (error) {
              console.error('Failed to update file after generation:', error);
            }
          }

          // Показываем уведомление
          if (callbacksRef.current.onShowAlert) {
            callbacksRef.current.onShowAlert('Прототип успешно сгенерирован', 'Успех', 'success', 4000);
          }

          // Переключаемся на таб прототипа
          setTimeout(() => {
            callbacksRef.current.setActiveTab('prototype');
          }, 100);
        } else {
          // Обновляем количество версий для следующей проверки
          previousVersionsCountRef.current = currentVersionsCount;
          callbacksRef.current.setPrototypeVersions(versions);
        }
      } catch (error) {
        console.error('Failed to check prototype versions:', error);
        // При ошибке проверяем, не истек ли таймаут
        const state = getGenerationState(selectedFileId);
        if (!state) {
          setIsGeneratingPrototype(false);
          isGeneratingRef.current = false;
          if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
          }
          if (callbacksRef.current.onShowAlert) {
            callbacksRef.current.onShowAlert('Генерация прототипа прервана или завершилась с ошибкой', 'Предупреждение', 'warning');
          }
        }
      }
    }, GENERATION_CHECK_INTERVAL);
  };

  const handleGenerateResult = async () => {
    if (!selectedFile || !documentCreatorAgent) return;

    setIsGeneratingPrototype(true);
    isGeneratingRef.current = true;

    // Сохраняем текущее количество версий для отслеживания новых
    if (selectedFileId) {
      try {
        const { versions } = await api.getPrototypeVersions(selectedFileId);
        previousVersionsCountRef.current = versions.length;
      } catch (error) {
        console.error('Failed to get initial versions count:', error);
        previousVersionsCountRef.current = 0;
      }

      // Сохраняем состояние генерации
      saveGenerationState(selectedFileId, Date.now());
    }

    // Запускаем проверку версий
    startVersionChecking();

    // Запускаем генерацию в фоне, не дожидаясь ответа
    api.generatePrototype(documentCreatorAgent.id, selectedFile.id)
      .then(() => {
        // Генерация завершилась, но мы уже отслеживаем через проверку версий
      })
      .catch((error: any) => {
        // Failed to generate result - handled by version checking
        
        // Останавливаем проверку
        setIsGeneratingPrototype(false);
        isGeneratingRef.current = false;
        if (selectedFileId) {
          clearGenerationState(selectedFileId);
        }
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = null;
        }

        if (callbacksRef.current.onShowAlert) {
          callbacksRef.current.onShowAlert(`Не удалось сгенерировать прототип: ${error?.message || 'Неизвестная ошибка'}`, 'Ошибка', 'error');
        }
      });
  };

  return {
    isGeneratingPrototype,
    handleGenerateResult,
  };
};


