/**
 * Хук для управления документами проекта
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { getSummaryFiles as getSummaryFilesService, generateSummary as generateSummaryService, uploadProjectFile as uploadProjectFileService, deleteProjectFile as deleteProjectFileService, deleteFileById as deleteFileByIdService } from '../../services/documentService';
import { mapFile } from '../../utils/mappers';
import { readFileToBase64 } from '../../utils/helpers';
import { UseDocumentsReturn } from '../types';
import { UploadedFile } from '../../types';

/**
 * Хук для управления документами проекта
 * 
 * Предоставляет методы для:
 * - Загрузки документов проекта (ensureSummaryLoaded)
 * - Генерации саммари (generateSummary)
 * - Загрузки файлов (uploadFile)
 * - Удаления файлов (removeFile)
 */
export const useDocuments = (
  activeAgentId: string | null,
  activeProjectId: string | null,
  isBootstrapping: boolean
): UseDocumentsReturn => {
  const [documents, setDocuments] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summarySuccess, setSummarySuccess] = useState(false);
  const loadedSummaryRef = useRef(new Set<string>());
  const isLoadingRef = useRef(false);
  const lastLoadedProjectRef = useRef<string | null>(null);

  /**
   * Загружает документы проекта
   */
  const ensureSummaryLoaded = useCallback(
    async (): Promise<void> => {
      if (!activeAgentId || !activeProjectId) return;

      // Документы проекта общие для всех агентов - используем ключ с projectId
      const PROJECT_DOCS_KEY = `${activeProjectId}:all`;

      // Проверяем, не загружается ли уже
      if (isLoadingRef.current) {
        if (import.meta.env.DEV) {
          console.log(`[Frontend] Documents already loading, skipping...`);
        }
        return;
      }

      // Проверяем кеш - если уже загружено для этого проекта, пропускаем
      if (loadedSummaryRef.current.has(PROJECT_DOCS_KEY)) {
        if (import.meta.env.DEV) {
          console.log(`[Frontend] Documents already loaded for project ${activeProjectId}, skipping...`);
        }
        return;
      }

      // Помечаем как загружаемый
      isLoadingRef.current = true;
      loadedSummaryRef.current.add(PROJECT_DOCS_KEY);

      try {
        if (import.meta.env.DEV) {
          console.log(`[Frontend] Loading project documents for agent: ${activeAgentId}, project: ${activeProjectId}`);
        }
        const { files } = await getSummaryFilesService(activeAgentId, activeProjectId);
        if (import.meta.env.DEV) {
          console.log(`[Frontend] ✅ Loaded project documents (ALL files from all agents):`, files.length, 'files');
        }
        const mapped = files.map(mapFile);
        setDocuments(mapped);
        lastLoadedProjectRef.current = activeProjectId;
      } catch (error: any) {
        // Если 404 - просто нет файлов, это нормально
        if (error?.status === 404 || error?.message?.includes('404') || error?.message?.includes('Not Found')) {
          if (import.meta.env.DEV) {
            console.log(`[Frontend] No project documents found (404 is normal if no files exist)`);
          }
          setDocuments([]);
          lastLoadedProjectRef.current = activeProjectId;
          return;
        }
        // Для других ошибок убираем из кеша, чтобы можно было повторить
        loadedSummaryRef.current.delete(PROJECT_DOCS_KEY);
        console.error('[Frontend] Failed to load project documents:', error);
        throw error;
      } finally {
        isLoadingRef.current = false;
      }
    },
    [activeAgentId, activeProjectId]
  );

  /**
   * Генерирует саммари для текущего агента
   */
  const generateSummary = useCallback(
    async (): Promise<void> => {
      if (!activeAgentId || !activeProjectId) return;
      
      setIsGeneratingSummary(true);
      try {
        if (import.meta.env.DEV) {
          console.log('[Frontend] handleGenerateSummary called:', {
            agentId: activeAgentId,
            projectId: activeProjectId,
          });
        }

        const { file } = await generateSummaryService(activeAgentId, activeProjectId);

        if (import.meta.env.DEV) {
          console.log('[Frontend] Summary generated successfully:', {
            fileId: file.id,
            fileName: file.name,
            agentId: file.agentId,
          });
        }

        const uploaded = mapFile(file);
        // Добавляем созданный файл в документы
        setDocuments((prev) => [uploaded, ...prev]);
        // Очищаем кеш загрузки, чтобы при следующем переключении файлы перезагрузились
        if (activeProjectId) {
          loadedSummaryRef.current.delete(`${activeProjectId}:all`);
        }
        setSummarySuccess(true);
        setTimeout(() => setSummarySuccess(false), 3000);
      } catch (error: any) {
        if (import.meta.env.DEV) {
          console.error('[Frontend] Summary generation failed:', error);
        }
        throw error;
      } finally {
        setIsGeneratingSummary(false);
      }
    },
    [activeAgentId, activeProjectId]
  );

  /**
   * Загружает файл в проект
   */
  const uploadFile = useCallback(
    async (file: File): Promise<void> => {
      if (!activeProjectId) {
        throw new Error('Выберите проект для загрузки файлов');
      }

      const base64Content = await readFileToBase64(file);
      await uploadProjectFileService(activeProjectId, {
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        content: base64Content,
      });

      // Перезагружаем документы
      if (activeProjectId) {
        loadedSummaryRef.current.delete(`${activeProjectId}:all`);
      }
      await ensureSummaryLoaded();
    },
    [activeProjectId, ensureSummaryLoaded]
  );

  /**
   * Загружает несколько файлов в проект
   */
  const uploadFiles = useCallback(
    async (files: FileList | File[]): Promise<void> => {
      if (!activeProjectId) {
        throw new Error('Выберите проект для загрузки файлов');
      }

      if (files.length === 0) {
        return;
      }

      setIsLoading(true);
      try {
        const uploadPromises = Array.from(files).map(async (file) => {
          const base64Content = await readFileToBase64(file);
          return uploadProjectFileService(activeProjectId, {
            name: file.name,
            mimeType: file.type || 'application/octet-stream',
            content: base64Content,
          });
        });

        await Promise.all(uploadPromises);

        // Перезагружаем документы
        if (activeProjectId) {
          loadedSummaryRef.current.delete(`${activeProjectId}:all`);
        }
        await ensureSummaryLoaded();
      } finally {
        setIsLoading(false);
      }
    },
    [activeProjectId, ensureSummaryLoaded]
  );

  /**
   * Удаляет файл из проекта
   */
  const removeFile = useCallback(
    async (fileId: string): Promise<void> => {
      if (!activeProjectId) {
        throw new Error('Не выбран активный проект');
      }

      const fileToRemove = documents.find(doc => doc.id === fileId);
      if (!fileToRemove) {
        if (import.meta.env.DEV) {
          console.error('[Frontend] File not found in documents:', { fileId });
        }
        return;
      }

      if (fileToRemove.isKnowledgeBase) {
        throw new Error('Управление базой знаний выполняет администратор.');
      }

      try {
        if (activeProjectId) {
          try {
            await deleteProjectFileService(activeProjectId, fileId);
          } catch (projectDeleteError: any) {
            const shouldFallback = projectDeleteError?.status === 403 || projectDeleteError?.status === 404;
            if (!shouldFallback) {
              throw projectDeleteError;
            }
            if (import.meta.env.DEV) {
              console.warn('[Frontend] Project-scoped deletion failed, falling back to direct delete', {
                fileId,
                projectId: activeProjectId,
                status: projectDeleteError?.status,
              });
            }
            await deleteFileByIdService(fileId);
          }
        } else {
          await deleteFileByIdService(fileId);
        }

        // Перезагружаем документы
        if (activeProjectId) {
          loadedSummaryRef.current.delete(`${activeProjectId}:all`);
        }
        await ensureSummaryLoaded();
      } catch (error: any) {
        console.error('[Frontend] Failed to remove file:', error);
        throw error;
      }
    },
    [activeProjectId, documents, ensureSummaryLoaded]
  );

  // Автоматически загружаем документы при переключении агента или проекта
  useEffect(() => {
    if (isBootstrapping || !activeAgentId || !activeProjectId) {
      return;
    }

    // Проверяем, изменился ли проект - если да, сбрасываем кеш
    const PROJECT_DOCS_KEY = `${activeProjectId}:all`;
    const projectChanged = lastLoadedProjectRef.current !== activeProjectId;
    
    if (projectChanged) {
      // Очищаем весь кеш при смене проекта
      loadedSummaryRef.current.clear();
      lastLoadedProjectRef.current = null;
    }

    // Загружаем документы с небольшой задержкой
    const timer = setTimeout(() => {
      if (import.meta.env.DEV) {
        console.log(`[Frontend] useEffect: Переключение на агента ${activeAgentId}, проект ${activeProjectId}, загрузка документов`);
      }
      ensureSummaryLoaded();
    }, 200);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBootstrapping, activeAgentId, activeProjectId]);

  return {
    documents,
    isLoading,
    isGeneratingSummary,
    summarySuccess,
    generateSummary,
    uploadFile,
    uploadFiles,
    removeFile,
    ensureSummaryLoaded,
  };
};

