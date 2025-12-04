import { useState, useEffect } from 'react';
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

  // Load prototype versions when file with prototype is selected
  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal is closed
      setPrototypeVersions([]);
      setSelectedVersionNumber(null);
      setIsVersionDropdownOpen(false);
      return;
    }
    
    const loadVersions = async () => {
      if (!selectedFileId || activeTab !== 'prototype') {
        setPrototypeVersions([]);
        setSelectedVersionNumber(null);
        return;
      }

      const file = documents.find(doc => doc.id === selectedFileId);
      if (!file || (!file.verstkaContent && !file.dslContent)) {
        setPrototypeVersions([]);
        setSelectedVersionNumber(null);
        return;
      }

      setIsLoadingVersions(true);
      try {
        const { versions } = await api.getPrototypeVersions(selectedFileId);
        setPrototypeVersions(versions);
        // Select latest version by default (highest versionNumber)
        if (versions.length > 0) {
          setSelectedVersionNumber(versions[0].versionNumber);
        } else {
          setSelectedVersionNumber(null);
        }
      } catch (error) {
        console.error('Failed to load prototype versions:', error);
        setPrototypeVersions([]);
        setSelectedVersionNumber(null);
      } finally {
        setIsLoadingVersions(false);
      }
    };

    loadVersions();
  }, [selectedFileId, activeTab, documents, isOpen]);

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


