/**
 * Контекст для управления историей чата и сообщениями
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useChat } from '../hooks/useChat';
import { useProjectContext } from './ProjectContext';
import { useAgentContext } from './AgentContext';
import { UseChatReturn } from '../hooks/types';

interface ChatContextValue extends UseChatReturn {}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const { activeProjectId } = useProjectContext();
  const { activeAgentId } = useAgentContext();
  const chat = useChat(activeAgentId, activeProjectId);

  return (
    <ChatContext.Provider value={chat}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = (): ChatContextValue => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider');
  }
  return context;
};

