/**
 * Компонент основного рабочего пространства
 */

import React from 'react';
import { Message, Agent } from '../types';
import { ChatInput } from './ChatInput';
import { WorkspaceHeader } from './WorkspacePage/WorkspaceHeader';
import { ChatArea } from './WorkspacePage/ChatArea';

interface WorkspacePageProps {
  activeAgent: Agent | undefined;
  messages: Message[];
  isLoading: boolean;
  isSidebarOpen: boolean;
  isAdmin: boolean;
  activeAgentId: string | null;
  onSidebarToggle: () => void;
  onSendMessage: (text: string) => Promise<void>;
  onClearChat: () => Promise<void>;
  onOpenAdmin: () => void;
  onSelectAgent: (agentId: string) => void;
}

export const WorkspacePage: React.FC<WorkspacePageProps> = ({
  activeAgent,
  messages,
  isLoading,
  isSidebarOpen,
  isAdmin,
  activeAgentId,
  onSidebarToggle,
  onSendMessage,
  onClearChat,
  onOpenAdmin,
  onSelectAgent,
}) => {
  // Логирование для диагностики onSendMessage в рендере
  if (import.meta.env.DEV) {
    console.log('[WorkspacePage] Render - onSendMessage prop:', {
      type: typeof onSendMessage,
      isFunction: typeof onSendMessage === 'function',
      value: onSendMessage,
      hasActiveAgent: !!activeAgent
    });
  }

  // Логирование для диагностики onSendMessage
  React.useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[WorkspacePage] useEffect - onSendMessage prop:', {
        type: typeof onSendMessage,
        isFunction: typeof onSendMessage === 'function',
        value: onSendMessage
      });
    }
  }, [onSendMessage]);

  if (!activeAgent) {
    return null;
  }

  return (
    <>
      <WorkspaceHeader
        activeAgent={activeAgent}
        isAdmin={isAdmin}
        activeAgentId={activeAgentId}
        onSidebarToggle={onSidebarToggle}
        onClearChat={onClearChat}
        onOpenAdmin={onOpenAdmin}
      />
      <ChatArea
        messages={messages}
        isLoading={isLoading}
        activeAgent={activeAgent}
        onSendMessage={onSendMessage}
      />
      <div className="flex-shrink-0 p-4 sm:p-6 bg-gradient-to-t from-black via-black/80 to-transparent z-20">
        <ChatInput onSend={onSendMessage} disabled={isLoading || !activeAgent} />
      </div>
    </>
  );
};

