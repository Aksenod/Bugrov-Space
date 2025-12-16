import { useState, useEffect, useRef, useCallback } from 'react';
import { UploadedFile, PrototypeVersion } from '../../types';
import { api } from '../../services/api';
import {
  SelectedSection,
  SectionEditState,
  isSectionSelectedMessage,
  injectEditScript,
  buildSectionSelector,
} from '../../utils/sectionEditHelpers';

interface UseSectionEditProps {
  selectedFile: UploadedFile | null;
  selectedFileId: string | null;
  prototypeVersions: PrototypeVersion[];
  selectedVersionNumber: number | null;
  onDocumentUpdate?: (file: UploadedFile) => void;
  onShowAlert?: (message: string, title?: string, variant?: 'success' | 'error' | 'info' | 'warning', duration?: number) => void;
  setPrototypeVersions: (versions: PrototypeVersion[]) => void;
  setSelectedVersionNumber: (version: number | null) => void;
}

export const useSectionEdit = ({
  selectedFile,
  selectedFileId,
  prototypeVersions,
  selectedVersionNumber,
  onDocumentUpdate,
  onShowAlert,
  setPrototypeVersions,
  setSelectedVersionNumber,
}: UseSectionEditProps) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedSection, setSelectedSection] = useState<SelectedSection | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Слушаем сообщения от iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (isSectionSelectedMessage(event.data)) {
        const { sectionId, html, innerHtml, tagName } = event.data;

        setSelectedSection({
          id: sectionId,
          html,
          innerHtml,
          tagName,
          selector: `[data-section-id="${sectionId}"]`,
        });

        setIsModalOpen(true);
        // Выключаем режим редактирования после выбора секции
        setIsEditMode(false);
        sendMessageToIframe({ type: 'EDIT_MODE_DISABLED' });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Отправка сообщения в iframe
  const sendMessageToIframe = useCallback((message: { type: string }) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(message, '*');
    }
  }, []);

  // Включение/выключение режима редактирования
  const toggleEditMode = useCallback(() => {
    const newMode = !isEditMode;
    setIsEditMode(newMode);

    if (newMode) {
      sendMessageToIframe({ type: 'EDIT_MODE_ENABLED' });
    } else {
      sendMessageToIframe({ type: 'EDIT_MODE_DISABLED' });
    }
  }, [isEditMode, sendMessageToIframe]);

  // Отмена редактирования
  const cancelEdit = useCallback(() => {
    setSelectedSection(null);
    setEditPrompt('');
    setPreviewHtml(null);
    setIsModalOpen(false);
    setIsProcessing(false);
  }, []);

  // Применение изменений
  const applyEdit = useCallback(async () => {
    if (!selectedFile || !selectedFileId || !selectedSection || !editPrompt.trim()) {
      return;
    }

    setIsProcessing(true);

    try {
      const response = await api.editSection(selectedFileId, {
        sectionId: selectedSection.id,
        sectionHtml: selectedSection.innerHtml,
        editPrompt: editPrompt.trim(),
        versionNumber: selectedVersionNumber || undefined,
      });

      // Обновляем версии
      const { versions } = await api.getPrototypeVersions(selectedFileId);
      setPrototypeVersions(versions);

      // Выбираем новую версию
      if (response.versionNumber) {
        setSelectedVersionNumber(response.versionNumber);
      } else if (versions.length > 0) {
        setSelectedVersionNumber(versions[0].versionNumber);
      }

      // Обновляем файл
      if (onDocumentUpdate && selectedFile) {
        const latestVersion = versions[0];
        const updatedFile: UploadedFile = {
          ...selectedFile,
          dslContent: latestVersion?.dslContent || selectedFile.dslContent,
          verstkaContent: response.fullHtml || latestVersion?.verstkaContent || selectedFile.verstkaContent,
        };
        onDocumentUpdate(updatedFile);
      }

      // Показываем уведомление об успехе
      if (onShowAlert) {
        onShowAlert('Секция успешно обновлена', 'Успех', 'success', 4000);
      }

      // Закрываем модальное окно
      cancelEdit();
    } catch (error: any) {
      console.error('Failed to edit section:', error);
      if (onShowAlert) {
        onShowAlert(
          `Не удалось обновить секцию: ${error?.message || 'Неизвестная ошибка'}`,
          'Ошибка',
          'error'
        );
      }
    } finally {
      setIsProcessing(false);
    }
  }, [
    selectedFile,
    selectedFileId,
    selectedSection,
    editPrompt,
    selectedVersionNumber,
    onDocumentUpdate,
    onShowAlert,
    setPrototypeVersions,
    setSelectedVersionNumber,
    cancelEdit,
  ]);

  // Получить HTML с инъектированным скриптом для режима редактирования
  const getEditableHtml = useCallback((html: string): string => {
    if (isEditMode) {
      return injectEditScript(html);
    }
    return html;
  }, [isEditMode]);

  // Установить ref на iframe
  const setIframeRef = useCallback((iframe: HTMLIFrameElement | null) => {
    iframeRef.current = iframe;

    // Если режим редактирования активен, отправляем сообщение
    if (iframe && isEditMode) {
      // Небольшая задержка, чтобы iframe успел загрузиться
      setTimeout(() => {
        sendMessageToIframe({ type: 'EDIT_MODE_ENABLED' });
      }, 100);
    }
  }, [isEditMode, sendMessageToIframe]);

  return {
    // Состояние
    isEditMode,
    selectedSection,
    editPrompt,
    isProcessing,
    previewHtml,
    isModalOpen,

    // Сеттеры
    setEditPrompt,
    setIsModalOpen,

    // Действия
    toggleEditMode,
    cancelEdit,
    applyEdit,

    // Хелперы
    getEditableHtml,
    setIframeRef,
  };
};
