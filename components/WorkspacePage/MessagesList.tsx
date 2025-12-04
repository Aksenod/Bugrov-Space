/**
 * Компонент списка сообщений
 */

import React, { useMemo } from 'react';
import { Message } from '../../types';
import { MessageBubble } from '../MessageBubble';
import { MessageSkeleton } from '../MessageSkeleton';

interface MessagesListProps {
  messages: Message[];
  isLoading: boolean;
}

export const MessagesList: React.FC<MessagesListProps> = ({ messages, isLoading }) => {
  // Уникальные сообщения (убираем дубликаты)
  const uniqueMessages = useMemo(() => {
    const unique = new Map<string, Message>();
    messages
      .filter((msg) => !(msg.isStreaming && msg.text.length === 0))
      .forEach((msg) => {
        if (!unique.has(msg.id) || msg.timestamp > unique.get(msg.id)!.timestamp) {
          unique.set(msg.id, msg);
        }
      });
    return Array.from(unique.values());
  }, [messages]);

  return (
    <>
      {uniqueMessages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {isLoading && uniqueMessages.length > 0 && <MessageSkeleton />}
    </>
  );
};

