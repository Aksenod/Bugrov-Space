import { useState, useEffect } from 'react';
import { UploadedFile, Agent } from '../../types';
import { hasRole } from '../../utils/documentHelpers';

interface UseDocumentTabsProps {
  selectedFile: UploadedFile | null;
  agents: Agent[];
  isOpen: boolean;
}

export const useDocumentTabs = ({ selectedFile, agents, isOpen }: UseDocumentTabsProps) => {
  const [activeTab, setActiveTab] = useState<'text' | 'prototype'>('text');
  const [prototypeSubTab, setPrototypeSubTab] = useState<'preview' | 'dsl' | 'html'>('preview');

  const setActiveTabSafe = (tab: 'text' | 'prototype') => {
    setActiveTab(tab);
    if (tab !== 'prototype') {
      setPrototypeSubTab('preview');
    } else {
      setPrototypeSubTab('preview');
    }
  };

  // Сбрасываем таб при смене документа или открытии модального окна
  useEffect(() => {
    if (isOpen && selectedFile) {
      const allAgents = agents;
      const creatorAgent = selectedFile.agentId 
        ? allAgents.find(agent => agent.id === selectedFile.agentId) 
        : null;
      const hasVerstkaRole = creatorAgent && hasRole(creatorAgent?.role, "verstka");

      if (hasVerstkaRole) {
        setActiveTabSafe('prototype');
        setPrototypeSubTab('preview');
      } else {
        setActiveTabSafe('text');
        setPrototypeSubTab('preview');
      }
    } else if (!isOpen) {
      // Сбрасываем таб при закрытии модального окна
      setActiveTabSafe('text');
      setPrototypeSubTab('preview');
    }
  }, [selectedFile?.id, isOpen, agents]);

  return {
    activeTab,
    setActiveTab: setActiveTabSafe,
    prototypeSubTab,
    setPrototypeSubTab,
  };
};


