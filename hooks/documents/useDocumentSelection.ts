import { useState, useEffect, useMemo } from 'react';
import { UploadedFile } from '../../types';

interface UseDocumentSelectionProps {
  documents: UploadedFile[];
  isOpen: boolean;
}

export const useDocumentSelection = ({ documents, isOpen }: UseDocumentSelectionProps) => {
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [localSelectedFile, setLocalSelectedFile] = useState<UploadedFile | null>(null);

  // Используем useMemo для стабильного вычисления selectedFile
  const selectedFile = useMemo(() => {
    return localSelectedFile || documents.find(doc => doc.id === selectedFileId) || null;
  }, [localSelectedFile, documents, selectedFileId]);

  // Синхронизируем локальное состояние с documents prop при смене файла
  useEffect(() => {
    if (selectedFileId) {
      const fileFromProps = documents.find(doc => doc.id === selectedFileId);
      if (fileFromProps) {
        setLocalSelectedFile(prev => {
          // Если локальный файл уже существует и имеет dslContent или verstkaContent - сохраняем его
          if (prev && prev.id === selectedFileId) {
            const hasLocalContent = (prev.dslContent && prev.dslContent.length > 0) ||
              (prev.verstkaContent && prev.verstkaContent.length > 0);
            const hasPropContent = (fileFromProps.dslContent && fileFromProps.dslContent.length > 0) ||
              (fileFromProps.verstkaContent && fileFromProps.verstkaContent.length > 0);

            // Если локальный файл имеет контент, которого нет в prop - оставляем локальный
            if (hasLocalContent && !hasPropContent) {
              return prev;
            }
          }
          return fileFromProps;
        });
      } else {
        // Если выбранный файл не найден в списке документов (был удален), сбрасываем выбор
        setSelectedFileId(null);
        setLocalSelectedFile(null);
      }
    } else {
      setLocalSelectedFile(null);
    }
  }, [documents, selectedFileId]);

  // Сбрасываем выбор при закрытии модального окна
  useEffect(() => {
    if (!isOpen) {
      setSelectedFileId(null);
      setLocalSelectedFile(null);
    }
  }, [isOpen]);

  return {
    selectedFileId,
    setSelectedFileId,
    localSelectedFile,
    setLocalSelectedFile,
    selectedFile,
  };
};


