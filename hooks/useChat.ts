/**
 * Хук для управления чатом (сообщениями)
 */

import { useReducer, useCallback, useMemo, useRef } from 'react';
import { getMessages as getMessagesService, sendMessage as sendMessageService, clearMessages as clearMessagesService } from '../services/messageService';
import { mapMessage } from '../utils/mappers';
import { UseChatReturn, ChatState, ChatAction } from './types';
import { Message, Role } from '../types';

/**
 * Reducer для управления состоянием чата
 */
const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case 'SET_MESSAGES': {
      return {
        ...state,
        chatHistories: {
          ...state.chatHistories,
          [action.payload.agentId]: action.payload.messages,
        },
      };
    }

    case 'ADD_MESSAGE': {
      const currentMessages = state.chatHistories[action.payload.agentId] ?? [];
      return {
        ...state,
        chatHistories: {
          ...state.chatHistories,
          [action.payload.agentId]: [...currentMessages, action.payload.message],
        },
      };
    }

    case 'CLEAR_MESSAGES': {
      const updated = { ...state.chatHistories };
      updated[action.payload.agentId] = [];
      return {
        ...state,
        chatHistories: updated,
      };
    }

    case 'SET_LOADING': {
      return {
        ...state,
        isLoading: action.payload,
      };
    }

    case 'MARK_LOADED': {
      const updated = new Set(state.loadedAgents);
      updated.add(action.payload);
      return {
        ...state,
        loadedAgents: updated,
      };
    }

    case 'CLEAR_LOADED': {
      const updated = new Set(state.loadedAgents);
      updated.delete(action.payload);
      return {
        ...state,
        loadedAgents: updated,
      };
    }

    case 'CLEAR_ALL_HISTORIES': {
      return {
        ...state,
        chatHistories: {},
        loadedAgents: new Set<string>(),
      };
    }

    default:
      return state;
  }
};

/**
 * Хук для управления чатом
 * 
 * Предоставляет методы для:
 * - Отправки сообщений (sendMessage)
 * - Очистки чата (clearChat)
 * - Загрузки истории сообщений (ensureMessagesLoaded)
 * - Управления состоянием загрузки
 */
export const useChat = (
  activeAgentId: string | null,
  activeProjectId: string | null
): UseChatReturn => {
  const [state, dispatch] = useReducer(chatReducer, {
    chatHistories: {},
    isLoading: false,
    loadedAgents: new Set<string>(),
  });

  // Вычисляем сообщения текущего агента
  const messages = useMemo((): Message[] => {
    if (!activeAgentId) return [];
    return state.chatHistories[activeAgentId] ?? [];
  }, [activeAgentId, state.chatHistories]);

  /**
   * Загружает сообщения для агента
   */
  const ensureMessagesLoaded = useCallback(
    async (agentId: string): Promise<void> => {
      if (!agentId || state.loadedAgents.has(agentId)) {
        return;
      }

      dispatch({ type: 'MARK_LOADED', payload: agentId });

      try {
        const { messages: apiMessages } = await getMessagesService(agentId, activeProjectId || undefined);
        dispatch({
          type: 'SET_MESSAGES',
          payload: {
            agentId,
            messages: apiMessages.map(mapMessage),
          },
        });
      } catch (error) {
        console.error('Failed to load messages', error);
        // Удаляем из loadedAgents, чтобы можно было попробовать снова
        dispatch({ type: 'CLEAR_LOADED', payload: agentId });
        dispatch({ type: 'SET_MESSAGES', payload: { agentId, messages: [] } });
      }
    },
    [activeProjectId, state.loadedAgents]
  );

  /**
   * Отправляет сообщение агенту
   */
  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      if (!activeAgentId || !text.trim() || state.isLoading) return;

      if (!activeProjectId) {
        throw new Error('Не выбран активный проект');
      }

      dispatch({ type: 'SET_LOADING', payload: true });

      const trimmedText = text.trim();
      const tempUserMessageId = `temp-user-${Date.now()}`;
      const loadingMessageId = `loading-${Date.now()}`;

      const tempUserMessage: Message = {
        id: tempUserMessageId,
        role: Role.USER,
        text: trimmedText,
        timestamp: new Date(),
      };

      const loadingMessage: Message = {
        id: loadingMessageId,
        role: Role.MODEL,
        text: '',
        timestamp: new Date(),
        isStreaming: true,
      };

      // Добавляем временные сообщения
      dispatch({ type: 'ADD_MESSAGE', payload: { agentId: activeAgentId, message: tempUserMessage } });
      dispatch({ type: 'ADD_MESSAGE', payload: { agentId: activeAgentId, message: loadingMessage } });

      try {
        const response = await sendMessageService(activeAgentId, trimmedText, activeProjectId);
        const newMessages = response.messages.map(mapMessage);

        // Удаляем временные сообщения и добавляем реальные
        const currentMessages = (state.chatHistories[activeAgentId] ?? []).filter(
          (msg) => msg.id !== tempUserMessageId && msg.id !== loadingMessageId
        );

        dispatch({
          type: 'SET_MESSAGES',
          payload: {
            agentId: activeAgentId,
            messages: [...currentMessages, ...newMessages],
          },
        });

        dispatch({ type: 'MARK_LOADED', payload: activeAgentId });
      } catch (error: any) {
        console.error('Chat error', error);

        const errorMessage = error?.message || 'Ошибка генерации. Попробуйте позже.';

        // Удаляем loading сообщение и добавляем ошибку
        const currentMessages = (state.chatHistories[activeAgentId] ?? []).filter(
          (msg) => msg.id !== loadingMessageId
        );

        const hasUserMessage = currentMessages.some(
          (msg) => msg.role === Role.USER && msg.text === trimmedText
        );

        const finalMessages = [
          ...currentMessages,
          ...(hasUserMessage ? [] : [tempUserMessage]),
          {
            id: `error-${Date.now()}-${Math.random()}`,
            role: Role.MODEL,
            text: errorMessage,
            timestamp: new Date(),
            isError: true,
          } as Message,
        ];

        dispatch({
          type: 'SET_MESSAGES',
          payload: {
            agentId: activeAgentId,
            messages: finalMessages,
          },
        });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    },
    [activeAgentId, activeProjectId, state.isLoading, state.chatHistories]
  );

  /**
   * Очищает чат для текущего агента
   */
  const clearChat = useCallback(
    async (): Promise<void> => {
      if (!activeAgentId) return;

      try {
        await clearMessagesService(activeAgentId, activeProjectId || undefined);
        dispatch({ type: 'CLEAR_MESSAGES', payload: { agentId: activeAgentId } });
        // Удаляем из loadedAgents, чтобы при следующем открытии загрузить заново
        dispatch({ type: 'CLEAR_LOADED', payload: activeAgentId });
      } catch (error: any) {
        console.error('Failed to clear chat', error);
        throw error;
      }
    },
    [activeAgentId, activeProjectId, state.loadedAgents]
  );

  return {
    messages,
    isLoading: state.isLoading,
    sendMessage,
    clearChat,
    ensureMessagesLoaded,
    loadedAgents: state.loadedAgents,
    // Внутренние методы для использования в bootstrap и других местах
    chatHistories: state.chatHistories,
    setChatHistories: (histories: Record<string, Message[]>) => {
      // Обновляем все истории сразу
      Object.entries(histories).forEach(([agentId, messages]) => {
        dispatch({ type: 'SET_MESSAGES', payload: { agentId, messages } });
      });
    },
    clearAllChatHistories: () => {
      dispatch({ type: 'CLEAR_ALL_HISTORIES' });
    },
    clearLoadedAgents: () => {
      // Очищаем все loadedAgents
      state.loadedAgents.forEach(agentId => {
        dispatch({ type: 'CLEAR_LOADED', payload: agentId });
      });
    },
  } as UseChatReturn & {
    chatHistories: Record<string, Message[]>;
    setChatHistories: (histories: Record<string, Message[]>) => void;
    clearAllChatHistories: () => void;
    clearLoadedAgents: () => void;
  };
};

