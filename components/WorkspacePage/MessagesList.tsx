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
  onDeleteMessage?: (messageId: string) => void;
  onSaveChat?: () => void;
  isGeneratingSummary?: boolean;
  summarySuccess?: boolean;
}

export const MessagesList: React.FC<MessagesListProps> = ({
  messages,
  isLoading,
  onDeleteMessage,
  onSaveChat,
  isGeneratingSummary,
  summarySuccess,
}) => {
  // Уникальные сообщения (убираем дубликаты)
  // Теперь не фильтруем пустые streaming сообщения - они будут показываться как индикатор генерации
  const uniqueMessages = useMemo(() => {
    const unique = new Map<string, Message>();
    messages.forEach((msg) => {
      if (!unique.has(msg.id) || msg.timestamp > unique.get(msg.id)!.timestamp) {
        unique.set(msg.id, msg);
      }
    });
    return Array.from(unique.values());
  }, [messages]);

  // Проверяем, есть ли уже streaming сообщение в списке
  const hasStreamingMessage = uniqueMessages.some((msg) => msg.isStreaming && msg.text.length === 0);

  return (
    <>
      {uniqueMessages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          onDelete={onDeleteMessage}
          onSaveChat={onSaveChat}
          isGeneratingSummary={isGeneratingSummary}
          summarySuccess={summarySuccess}
        />
      ))}
      {/* Показываем MessageSkeleton только если isLoading и нет streaming сообщения (чтобы избежать дублирования) */}
      {isLoading && !hasStreamingMessage && <MessageSkeleton />}
    </>
  );
};

