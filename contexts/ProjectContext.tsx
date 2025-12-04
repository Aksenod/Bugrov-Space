/**
 * Контекст для управления проектами и активным проектом
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useProjects } from '../hooks/useProjects';
import { UseProjectsReturn } from '../hooks/types';

interface ProjectContextValue extends UseProjectsReturn {}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

interface ProjectProviderProps {
  children: ReactNode;
}

export const ProjectProvider: React.FC<ProjectProviderProps> = ({ children }) => {
  const projects = useProjects();

  return (
    <ProjectContext.Provider value={projects}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjectContext = (): ProjectContextValue => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjectContext must be used within ProjectProvider');
  }
  return context;
};

