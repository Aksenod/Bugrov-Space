import { useState } from 'react';
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

  const handleGenerateResult = async () => {
    if (!selectedFile || !documentCreatorAgent) return;

    setIsGeneratingPrototype(true);

    try {
      const { file } = await api.generatePrototype(
        documentCreatorAgent.id,
        selectedFile.id
      );

      // Создаём обновлённый файл
      const updatedFile: UploadedFile = {
        id: file.id,
        name: file.name,
        type: file.mimeType,
        data: file.content,
        agentId: file.agentId,
        dslContent: file.dslContent,
        verstkaContent: file.verstkaContent,
      };

      // Обновляем документ в родительском компоненте
      if (onDocumentUpdate) {
        onDocumentUpdate(updatedFile);
      }

      // Показываем уведомление об успешной генерации
      if (onShowAlert) {
        onShowAlert('Прототип успешно сгенерирован', 'Успех', 'success', 4000);
      }

      // Переключаемся на таб прототипа
      setTimeout(() => {
        setActiveTab('prototype');
        // Reload versions after generation
        if (selectedFileId) {
          api.getPrototypeVersions(selectedFileId).then(({ versions }) => {
            setPrototypeVersions(versions);
            if (versions.length > 0) {
              setSelectedVersionNumber(versions[0].versionNumber);
            }
          }).catch(console.error);
        }
      }, 100);
    } catch (error: any) {
      console.error('Failed to generate result:', error);
      if (onShowAlert) {
        onShowAlert(`Не удалось сгенерировать прототип: ${error?.message || 'Неизвестная ошибка'}`, 'Ошибка', 'error');
      } else {
        console.error(`Не удалось сгенерировать прототип: ${error?.message || 'Неизвестная ошибка'}`);
      }
    } finally {
      setIsGeneratingPrototype(false);
    }
  };

  return {
    isGeneratingPrototype,
    handleGenerateResult,
  };
};


