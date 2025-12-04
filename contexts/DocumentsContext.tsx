/**
 * Контекст для управления документами проекта
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useDocuments } from '../hooks/documents/useDocuments';
import { useProjectContext } from './ProjectContext';
import { useAgentContext } from './AgentContext';
import { useBootstrapContext } from './BootstrapContext';
import { UseDocumentsReturn } from '../hooks/types';

interface DocumentsContextValue extends UseDocumentsReturn {}

const DocumentsContext = createContext<DocumentsContextValue | undefined>(undefined);

interface DocumentsProviderProps {
  children: ReactNode;
}

export const DocumentsProvider: React.FC<DocumentsProviderProps> = ({ children }) => {
  const { activeProjectId } = useProjectContext();
  const { activeAgentId } = useAgentContext();
  const { isBootstrapping } = useBootstrapContext();
  const documents = useDocuments(activeAgentId, activeProjectId, isBootstrapping);

  return (
    <DocumentsContext.Provider value={documents}>
      {children}
    </DocumentsContext.Provider>
  );
};

export const useDocumentsContext = (): DocumentsContextValue => {
  const context = useContext(DocumentsContext);
  if (!context) {
    throw new Error('useDocumentsContext must be used within DocumentsProvider');
  }
  return context;
};

