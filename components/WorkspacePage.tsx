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
  onDeleteMessage: (messageId: string) => Promise<void>;
  onCancelMessage?: () => void;
  onClearChat: () => Promise<void>;
  onOpenAdmin: (agentId?: string | null) => void;
  onSelectAgent: (agentId: string) => void;
  onSaveChat?: () => void;
  isGeneratingSummary?: boolean;
  summarySuccess?: boolean;
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
  onDeleteMessage,
  onCancelMessage,
  onClearChat,
  onOpenAdmin,
  onSelectAgent,
  onSaveChat,
  isGeneratingSummary,
  summarySuccess,
}) => {
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
        onDeleteMessage={onDeleteMessage}
        onSaveChat={onSaveChat}
        isGeneratingSummary={isGeneratingSummary}
        summarySuccess={summarySuccess}
      />
      <div className="flex-shrink-0 p-4 sm:p-6 bg-gradient-to-t from-black via-black/80 to-transparent z-20">
        <ChatInput
          onSend={onSendMessage}
          disabled={isLoading || !activeAgent}
          isLoading={isLoading}
          onCancel={onCancelMessage}
        />
      </div>
    </>
  );
};

