import { prisma } from '../../db/prisma';
import { withRetry } from '../../utils/prismaRetry';
import { logger } from '../../utils/logger';
import { generateAgentResponse, ConversationMessage } from '../openaiService';

/**
 * Загрузить сообщения агента
 */
export const loadMessages = async (agentId: string, limit?: number) => {
  return await withRetry(
    () => prisma.message.findMany({
      where: { agentId },
      orderBy: { createdAt: 'asc' },
      ...(limit ? { take: limit } : {}),
    }),
    3,
    `loadMessages - ${agentId}`
  );
};

/**
 * Подготовить контекст агента для генерации ответа
 */
const prepareAgentContext = (agent: any, allFiles: any[]) => {
  return {
    ...agent,
    files: allFiles,
    role: agent.role || null,
  };
};

/**
 * Загрузить историю разговора
 */
const loadConversationHistory = async (agentId: string, limit: number = 50): Promise<ConversationMessage[]> => {
  const messages = await loadMessages(agentId, limit);
  return messages.map((message): ConversationMessage => ({
    role: message.role === 'USER' ? 'USER' : 'MODEL',
    text: message.text,
  }));
};

/**
 * Отправить сообщение и получить ответ от агента
 */
export const sendMessage = async (
  agent: any,
  userId: string,
  text: string,
  projectId: string,
  allFiles: any[],
  projectInfo?: { name: string | null; description: string | null; projectTypeName: string | null }
) => {
  // Создаем сообщение пользователя
  const userMessage = await withRetry(
    () => prisma.message.create({
      data: {
        agentId: agent.id,
        userId,
        role: 'USER',
        text: text,
      },
    }),
    3,
    `sendMessage - create user message`
  );

  // Загружаем историю разговора
  const conversationHistory = await loadConversationHistory(agent.id, 50);

  // Подготавливаем контекст агента
  const agentWithAllFiles = prepareAgentContext(agent, allFiles);

  // Генерируем ответ
  const responseText = await generateAgentResponse(
    agentWithAllFiles,
    conversationHistory,
    text,
    projectInfo,
  );

  // Создаем сообщение модели
  const modelMessage = await withRetry(
    () => prisma.message.create({
      data: {
        agentId: agent.id,
        role: 'MODEL',
        text: responseText,
      },
    }),
    3,
    `sendMessage - create model message`
  );

  logger.info({
    agentId: agent.id,
    agentName: agent.name,
    messagesCount: conversationHistory.length,
  }, 'Message sent and response generated');

  return {
    userMessage,
    modelMessage,
  };
};

/**
 * Очистить все сообщения агента
 */
export const clearMessages = async (agentId: string): Promise<void> => {
  await withRetry(
    () => prisma.message.deleteMany({
      where: { agentId },
    }),
    3,
    `clearMessages - ${agentId}`
  );
  logger.debug({ agentId }, 'Messages cleared');
};

