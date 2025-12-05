/**
 * Компонент области чата
 */

import React, { useRef, useEffect } from 'react';
import { Message } from '../../types';
import { Agent } from '../../types';
import { MessagesList } from './MessagesList';
import { EmptyChatState } from './EmptyChatState';

interface ChatAreaProps {
  messages: Message[];
  isLoading: boolean;
  activeAgent: Agent | undefined;
  onSendMessage: (text: string) => Promise<void>;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ messages, isLoading, activeAgent, onSendMessage }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Автопрокрутка к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeAgent?.id, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin relative bg-gradient-to-b from-transparent via-transparent to-black/20">
      {messages.length === 0 && <EmptyChatState activeAgent={activeAgent} onSendMessage={onSendMessage} />}
      <MessagesList messages={messages} isLoading={isLoading} />
      <div ref={messagesEndRef} />
    </div>
  );
};

