import { useState, useEffect } from 'react';
import { UploadedFile } from '../../types';
import { api } from '../../services/api';

interface UseDocumentEditorProps {
  selectedFile: UploadedFile | null;
  onDocumentUpdate?: (file: UploadedFile) => void;
  onShowAlert?: (message: string, title?: string, variant?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const useDocumentEditor = ({ 
  selectedFile, 
  onDocumentUpdate, 
  onShowAlert 
}: UseDocumentEditorProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Сбрасываем режим редактирования при смене файла
  useEffect(() => {
    if (!selectedFile) {
      setIsEditing(false);
      setEditedContent('');
    }
  }, [selectedFile?.id]);

  const decodeContent = (base64: string): string => {
    try {
      return decodeURIComponent(escape(window.atob(base64)));
    } catch (e) {
      return "Не удалось прочитать файл или это бинарный файл.";
    }
  };

  const handleEdit = () => {
    if (!selectedFile) return;
    const content = decodeContent(selectedFile.data);
    setEditedContent(content);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent('');
  };

  const handleSaveEdit = async () => {
    if (!selectedFile) return;

    setIsSaving(true);
    try {
      // Кодируем контент в base64
      const encodedContent = window.btoa(unescape(encodeURIComponent(editedContent)));

      const { file } = await api.updateFileContent(selectedFile.id, encodedContent);

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

      // Выходим из режима редактирования
      setIsEditing(false);
      setEditedContent('');

      if (onShowAlert) {
        onShowAlert('Документ успешно обновлен', 'Успех', 'success');
      }
    } catch (error: any) {
      console.error('Failed to update file:', error);
      if (onShowAlert) {
        onShowAlert(`Не удалось обновить документ: ${error?.message || 'Неизвестная ошибка'}`, 'Ошибка', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return {
    isEditing,
    editedContent,
    setEditedContent,
    isSaving,
    handleEdit,
    handleCancelEdit,
    handleSaveEdit,
    decodeContent,
  };
};


