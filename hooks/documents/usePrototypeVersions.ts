import { useState, useEffect, useRef } from 'react';
import { PrototypeVersion } from '../../types';
import { api } from '../../services/api';
import { UploadedFile } from '../../types';

interface UsePrototypeVersionsProps {
  selectedFileId: string | null;
  activeTab: 'text' | 'prototype';
  documents: UploadedFile[];
  isOpen: boolean;
}

export const usePrototypeVersions = ({
  selectedFileId,
  activeTab,
  documents,
  isOpen,
}: UsePrototypeVersionsProps) => {
  const [prototypeVersions, setPrototypeVersions] = useState<PrototypeVersion[]>([]);
  const [selectedVersionNumber, setSelectedVersionNumber] = useState<number | null>(null);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [isVersionDropdownOpen, setIsVersionDropdownOpen] = useState(false);
  const previousFileIdRef = useRef<string | null>(null);
  const selectedVersionRef = useRef<number | null>(null);
  const documentsRef = useRef<UploadedFile[]>(documents);

  // Синхронизируем ref с состоянием
  useEffect(() => {
    selectedVersionRef.current = selectedVersionNumber;
  }, [selectedVersionNumber]);

  // Обновляем ref documents без вызова перезагрузки
  useEffect(() => {
    documentsRef.current = documents;
  }, [documents]);

  // Load prototype versions when file with prototype is selected
  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal is closed
      setPrototypeVersions([]);
      setSelectedVersionNumber(null);
      setIsVersionDropdownOpen(false);
      previousFileIdRef.current = null;
      selectedVersionRef.current = null;
      return;
    }
    
    const loadVersions = async () => {
      if (!selectedFileId || activeTab !== 'prototype') {
        setPrototypeVersions([]);
        setSelectedVersionNumber(null);
        previousFileIdRef.current = selectedFileId;
        return;
      }

      const file = documentsRef.current.find(doc => doc.id === selectedFileId);
      if (!file || (!file.verstkaContent && !file.dslContent)) {
        setPrototypeVersions([]);
        setSelectedVersionNumber(null);
        previousFileIdRef.current = selectedFileId;
        return;
      }

      // Если файл изменился, сбрасываем выбор версии
      const fileChanged = previousFileIdRef.current !== selectedFileId;
      // Сохраняем текущий выбор версии перед загрузкой
      const currentSelectedVersion = fileChanged ? null : selectedVersionRef.current;

      setIsLoadingVersions(true);
      try {
        const { versions } = await api.getPrototypeVersions(selectedFileId);
        setPrototypeVersions(versions);
        
        // Если файл изменился или версия не выбрана, выбираем последнюю версию
        if (fileChanged || currentSelectedVersion === null) {
          if (versions.length > 0) {
            const latestVersion = versions[0].versionNumber;
            setSelectedVersionNumber(latestVersion);
            selectedVersionRef.current = latestVersion;
          } else {
            setSelectedVersionNumber(null);
            selectedVersionRef.current = null;
          }
        } else {
          // Если файл не изменился, проверяем, существует ли выбранная версия
          const versionExists = versions.some(v => v.versionNumber === currentSelectedVersion);
          
          if (versionExists) {
            // Версия существует - используем функциональное обновление для проверки актуального состояния
            // Если версия уже выбрана пользователем, не меняем состояние
            setSelectedVersionNumber(prev => {
              // Если текущее состояние уже совпадает с выбранной версией, не меняем
              if (prev === currentSelectedVersion) {
                return prev;
              }
              // Иначе обновляем (может быть из-за замыкания или если пользователь только что выбрал)
              return currentSelectedVersion;
            });
            // Обновляем ref в любом случае
            selectedVersionRef.current = currentSelectedVersion;
          } else {
            // Если выбранная версия больше не существует, выбираем последнюю
            if (versions.length > 0) {
              const latestVersion = versions[0].versionNumber;
              setSelectedVersionNumber(latestVersion);
              selectedVersionRef.current = latestVersion;
            } else {
              setSelectedVersionNumber(null);
              selectedVersionRef.current = null;
            }
          }
        }
        
        previousFileIdRef.current = selectedFileId;
      } catch (error) {
        console.error('Failed to load prototype versions:', error);
        setPrototypeVersions([]);
        setSelectedVersionNumber(null);
        selectedVersionRef.current = null;
        previousFileIdRef.current = selectedFileId;
      } finally {
        setIsLoadingVersions(false);
      }
    };

    loadVersions();
  }, [selectedFileId, activeTab, isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) {
      setIsVersionDropdownOpen(false);
      return;
    }
    
    const handleClickOutside = (event: MouseEvent) => {
      if (isVersionDropdownOpen) {
        const target = event.target as HTMLElement;
        if (!target.closest('.version-dropdown-container')) {
          setIsVersionDropdownOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVersionDropdownOpen, isOpen]);

  return {
    prototypeVersions,
    setPrototypeVersions,
    selectedVersionNumber,
    setSelectedVersionNumber,
    isLoadingVersions,
    isVersionDropdownOpen,
    setIsVersionDropdownOpen,
  };
};


