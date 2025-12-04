/**
 * Контекст для управления агентами и активным агентом
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useAgents } from '../hooks/useAgents';
import { useProjectContext } from './ProjectContext';
import { UseAgentsReturn } from '../hooks/types';

interface AgentContextValue extends UseAgentsReturn {}

const AgentContext = createContext<AgentContextValue | undefined>(undefined);

interface AgentProviderProps {
  children: ReactNode;
}

export const AgentProvider: React.FC<AgentProviderProps> = ({ children }) => {
  const { activeProjectId } = useProjectContext();
  const agents = useAgents(activeProjectId);

  return (
    <AgentContext.Provider value={agents}>
      {children}
    </AgentContext.Provider>
  );
};

export const useAgentContext = (): AgentContextValue => {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useAgentContext must be used within AgentProvider');
  }
  return context;
};

