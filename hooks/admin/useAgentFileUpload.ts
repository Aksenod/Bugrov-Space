import { useState, useRef } from 'react';
import { ApiProjectTypeAgent } from '../../services/api';
import { UploadedFile } from '../../types';
import { api } from '../../services/api';

interface UseAgentFileUploadProps {
  editingAgent: ApiProjectTypeAgent | null;
  agentFiles: UploadedFile[];
  setAgentFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  showAlert: (message: string, title?: string, variant?: 'success' | 'error' | 'info' | 'warning', duration?: number) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, variant?: 'danger' | 'warning' | 'info') => void;
}

const FILE_SIZE_LIMIT = 2 * 1024 * 1024;
const allowedExtensions = ['.txt', '.md'];
const allowedMimeTypes = ['text/plain', 'text/markdown'];

const readFileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const useAgentFileUpload = ({
  editingAgent,
  agentFiles,
  setAgentFiles,
  showAlert,
  showConfirm,
}: UseAgentFileUploadProps) => {
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (fileList: FileList) => {
    if (!editingAgent || !fileList.length) {
      if (!editingAgent) {
        showAlert('Сначала создайте агента', 'Ошибка', 'error', 5000);
      }
      return;
    }

    setIsUploadingFiles(true);
    const uploads: UploadedFile[] = [];
    const errors: string[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];

      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      const isValidExtension = allowedExtensions.includes(fileExtension);
      const isValidMimeType = !file.type || allowedMimeTypes.includes(file.type);

      if (!isValidExtension && !isValidMimeType) {
        errors.push(`Файл ${file.name} не поддерживается. Разрешены только .txt и .md файлы.`);
        continue;
      }

      if (file.size > FILE_SIZE_LIMIT) {
        errors.push(`Файл ${file.name} слишком большой (>2MB)`);
        continue;
      }

      try {
        const base64 = await readFileToBase64(file);
        const { file: uploaded } = await api.uploadAdminAgentFile(editingAgent.id, {
          name: file.name,
          mimeType: file.type || 'text/plain',
          content: base64,
          isKnowledgeBase: true,
        });
        uploads.push({
          id: uploaded.id,
          name: uploaded.name,
          type: uploaded.mimeType,
          data: uploaded.content,
          agentId: uploaded.agentId,
        });
      } catch (error: any) {
        console.error('File upload failed', error);
        let userMessage = `Не удалось загрузить ${file.name}`;
        const errorStatus = error?.status || error?.statusCode || 'unknown';
        if (errorStatus === 500) {
          userMessage += ': Ошибка сервера. Возможно, миграция базы данных не применена.';
        } else if (errorStatus === 404) {
          userMessage += ': Агент не найден.';
        } else if (errorStatus === 401 || errorStatus === 403) {
          userMessage += ': Недостаточно прав доступа.';
        } else if (error?.message) {
          userMessage += `: ${error.message}`;
        } else {
          userMessage += ': Неизвестная ошибка. Проверьте консоль браузера.';
        }
        errors.push(userMessage);
      }
    }

    if (errors.length > 0) {
      showAlert(`Ошибки при загрузке файлов:\n${errors.join('\n')}`, 'Ошибка', 'error', 5000);
    }

    if (uploads.length > 0) {
      setAgentFiles(prev => [...prev, ...uploads]);

      try {
        const { files: refreshedFiles } = await api.getAdminAgentFiles(editingAgent.id);
        setAgentFiles(refreshedFiles.map(file => ({
          id: file.id,
          name: file.name,
          type: file.mimeType,
          data: file.content,
          agentId: file.agentId,
        })));
      } catch (error: any) {
        console.error('[AdminPage] Failed to reload files after upload', error);
      }

      showAlert(`Успешно загружено файлов: ${uploads.length}`, 'Успех', 'success', 3000);
    }

    setIsUploadingFiles(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFile = async (fileId: string) => {
    if (!editingAgent) return;

    showConfirm(
      'Удалить файл из базы знаний?',
      'Файл будет удален из базы знаний.\n\nЭто действие нельзя отменить.',
      async () => {
        try {
          await api.deleteAdminAgentFile(editingAgent.id, fileId);
          setAgentFiles(prev => prev.filter(file => file.id !== fileId));
          showAlert('Файл успешно удален', undefined, 'success', 3000);
        } catch (error: any) {
          console.error('Failed to remove file', error);
          showAlert(`Не удалось удалить файл: ${error?.message || 'Неизвестная ошибка'}`, 'Ошибка', 'error', 5000);
        }
      },
      'danger'
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  return {
    isUploadingFiles,
    fileInputRef,
    handleFileChange,
    handleDragOver,
    handleDrop,
    handleRemoveFile,
  };
};

