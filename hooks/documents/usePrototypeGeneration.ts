import { useState, useEffect } from 'react';
import { UploadedFile, Agent } from '../../types';
import { api } from '../../services/api';

interface UsePrototypeGenerationProps {
  selectedFile: UploadedFile | null;
  documentCreatorAgent: Agent | null | undefined;
  selectedFileId: string | null;
  onDocumentUpdate?: (file: UploadedFile) => void;
  onShowAlert?: (message: string, title?: string, variant?: 'success' | 'error' | 'info' | 'warning') => void;
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
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Timer for prototype generation - calculates duration based on content size
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (isGeneratingPrototype && selectedFile && selectedFile.data) {
      try {
        // Calculate estimated time based on content size
        const decodeContent = (base64: string): string => {
          try {
            return decodeURIComponent(escape(window.atob(base64)));
          } catch (e) {
            return "";
          }
        };
        const contentSize = decodeContent(selectedFile.data).length;
        // Formula: 30s base + 1s per 100 characters, min 30s, max 180s
        const estimatedSeconds = Math.min(180, Math.max(30, 30 + Math.floor(contentSize / 100)));

        setTimeLeft(estimatedSeconds);
        interval = setInterval(() => {
          setTimeLeft((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
        }, 1000);
      } catch (error) {
        console.error('Error calculating timer:', error);
        setTimeLeft(null);
      }
    } else {
      setTimeLeft(null);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isGeneratingPrototype, selectedFile]);

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
    timeLeft,
    handleGenerateResult,
  };
};


