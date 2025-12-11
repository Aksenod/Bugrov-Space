import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../db/prisma';
import { withRetry } from '../../utils/prismaRetry';
import { logger } from '../../utils/logger';
import { getOrCreateAgentFromTemplate } from '../../services/agents/agentTemplateService';
import { loadMessages, sendMessage, clearMessages, deleteMessageById } from '../../services/agents/messageService';
import { prepareFilesForAgent } from '../../services/agents/fileService';
import { AuthenticatedRequest } from '../../types/express';

const messageSchema = z.object({
  text: z.string().min(1),
  projectId: z.string().optional(),
});

/**
 * Получить сообщения агента
 */
export const getMessages = async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.userId!;
  const { agentId } = req.params;
  const projectId = req.query.projectId as string | undefined;

  logger.info({
    agentId,
    userId,
    projectId,
    hasProjectId: !!projectId
  }, 'GET /agents/:agentId/messages - request received');

  let agent = null;

  if (projectId) {
    agent = await getOrCreateAgentFromTemplate(agentId, userId, projectId);
  } else {
    agent = await withRetry(
      () => prisma.agent.findFirst({
        where: { id: agentId, userId },
      }),
      3,
      `GET /agents/${agentId}/messages - find agent`
    );

    if (!agent) {
      try {
        const projectTypeAgent = await withRetry(
          () => (prisma as any).projectTypeAgent.findUnique({
            where: { id: agentId },
          }),
          3,
          `GET /agents/${agentId}/messages - check if ProjectTypeAgent`
        );

        if (projectTypeAgent) {
          logger.debug({ agentId, userId }, 'ProjectTypeAgent template found, returning empty messages array (no projectId provided)');
          return res.json({ messages: [] });
        }
      } catch (error: any) {
        logger.error({ agentId, userId, error: error.message, code: error.code }, 'Error checking ProjectTypeAgent');
      }
    }
  }

  if (!agent) {
    logger.warn({ agentId, userId, projectId }, 'Agent not found and not a ProjectTypeAgent');
    return res.status(404).json({ error: 'Agent not found' });
  }

  if (agent.userId !== userId) {
    logger.warn({ agentId: agent.id, agentUserId: agent.userId, currentUserId: userId }, 'Attempt to access messages of agent belonging to different user');
    return res.status(403).json({ error: 'Access denied. Agent belongs to different user.' });
  }

  const messages = await loadMessages(agent.id);

  logger.debug({ agentId: agent.id, messagesCount: messages.length }, 'Messages loaded successfully');

  res.json({ messages });
};

/**
 * Отправить сообщение агенту
 */
export const postMessage = async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.userId!;
  const { agentId } = req.params;

  logger.info({
    agentId,
    userId,
    body: req.body,
    hasProjectId: !!req.body?.projectId
  }, 'POST /agents/:agentId/messages - request received');

  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) {
    logger.warn({ agentId, userId, validationError: parsed.error.flatten() }, 'Message validation failed');
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  if (!parsed.data.projectId) {
    logger.warn({ agentId, userId }, 'projectId is missing in request body');
    return res.status(400).json({
      error: 'projectId is required. Project isolation requires explicit project context.'
    });
  }

  const agent = await getOrCreateAgentFromTemplate(
    agentId,
    userId,
    parsed.data.projectId
  );

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  const project = await withRetry(
    () => prisma.project.findFirst({
      where: { id: parsed.data.projectId, userId },
      include: { projectType: true },
    }),
    3,
    `POST /agents/${agentId}/messages - verify project ${parsed.data.projectId}`
  );

  if (!project) {
    logger.warn({ agentId, userId, projectId: parsed.data.projectId }, 'Project not found or does not belong to user');
    return res.status(404).json({ error: 'Project not found' });
  }

  const projectId = parsed.data.projectId!;
  const [projectAgents] = await Promise.all([
    withRetry(
      () => prisma.agent.findMany({
        where: { projectId: projectId, userId },
        select: { id: true },
      }),
      3,
      `POST /agents/${agentId}/messages - find project agents`
    ),
  ]);

  const agentIds = projectAgents.map(a => a.id);

  // Подготавливаем все файлы для агента
  const allFiles = await prepareFilesForAgent(agent, agentId, agentIds);

  const agentWithAllFiles = {
    ...agent,
    files: allFiles,
    role: agent.role || null,
  };

  logger.info({
    agentId: agent.id,
    agentName: agent.name,
    agentModel: agent.model,
    projectId: parsed.data.projectId,
  }, 'Preparing to generate agent response');

  try {
    const projectInfo = project ? {
      name: project.name || null,
      description: project.description || null,
      projectTypeName: project.projectType?.name || null,
    } : undefined;

    const { userMessage, modelMessage } = await sendMessage(
      agentWithAllFiles,
      userId,
      parsed.data.text,
      projectId,
      allFiles,
      projectInfo
    );

    const response: any = { messages: [userMessage, modelMessage] };
    if (agent.id !== agentId) {
      response.agentId = agent.id;
      response.templateId = agentId;
    }

    return res.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to get response from OpenAI';
    logger.error({
      agentId,
      agentName: agent.name,
      agentModel: agent.model,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    }, 'OpenAI API error');

    let userFriendlyMessage = 'Ошибка генерации. Попробуйте позже.';
    if (errorMessage.includes('API key') || errorMessage.includes('Invalid API key')) {
      userFriendlyMessage = 'Неверный API ключ OpenAI. Проверьте настройки сервера.';
    } else if (errorMessage.includes('rate limit') || errorMessage.includes('Rate limit')) {
      userFriendlyMessage = 'Превышен лимит запросов к OpenAI. Попробуйте позже.';
    } else if (errorMessage.includes('model') || errorMessage.includes('Model') || errorMessage.includes('not found')) {
      userFriendlyMessage = `Ошибка модели OpenAI. Модель "${agent.model || 'не указана'}" недоступна. Проверьте настройки агента.`;
    }
    return res.status(500).json({ error: userFriendlyMessage, details: errorMessage });
  }
};

/**
 * Удалить все сообщения агента
 */
export const deleteMessages = async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.userId!;
  const { agentId } = req.params;
  const projectId = req.query.projectId as string | undefined;

  logger.info({
    agentId,
    userId,
    projectId,
    hasProjectId: !!projectId
  }, 'DELETE /agents/:agentId/messages - request received');

  let agent = null;

  if (projectId) {
    agent = await getOrCreateAgentFromTemplate(agentId, userId, projectId);
  } else {
    agent = await withRetry(
      () => prisma.agent.findFirst({
        where: { id: agentId, userId },
      }),
      3,
      `DELETE /agents/${agentId}/messages - find agent`
    );

    if (!agent) {
      try {
        const projectTypeAgent = await withRetry(
          () => (prisma as any).projectTypeAgent.findUnique({
            where: { id: agentId },
          }),
          3,
          `DELETE /agents/${agentId}/messages - check if ProjectTypeAgent`
        );

        if (projectTypeAgent) {
          logger.debug({ agentId, userId }, 'ProjectTypeAgent template found, no messages to delete');
          return res.status(204).send();
        }
      } catch (error: any) {
        logger.error({ agentId, userId, error: error.message, code: error.code }, 'Error checking ProjectTypeAgent');
      }
    }
  }

  if (!agent) {
    logger.warn({ agentId, userId, projectId }, 'Agent not found and not a ProjectTypeAgent');
    return res.status(404).json({ error: 'Agent not found' });
  }

  await clearMessages(agent.id);

  logger.debug({ agentId: agent.id }, 'Messages deleted successfully');
  res.status(204).send();
};

/**
 * Удалить конкретное сообщение агента
 */
export const deleteMessage = async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.userId!;
  const { agentId, messageId } = req.params;
  const projectId = req.query.projectId as string | undefined;

  logger.info({
    agentId,
    messageId,
    userId,
    projectId,
    hasProjectId: !!projectId,
  }, 'DELETE /agents/:agentId/messages/:messageId - request received');

  // Ищем сообщение по id и проверяем владельца агента, чтобы избежать 404 из-за расхождения agentId/templateId
  const message = await withRetry(
    () => prisma.message.findFirst({
      where: { id: messageId },
      include: { agent: true },
    }),
    3,
    `DELETE /agents/${agentId}/messages/${messageId} - find message`
  );

  if (!message) {
    logger.warn({ agentId, messageId }, 'Message not found for deletion');
    return res.status(404).json({ error: 'Message not found' });
  }

  if (!message.agent || message.agent.userId !== userId) {
    logger.warn({ agentId: message.agentId, messageId, userId }, 'Attempt to delete message of another user');
    return res.status(403).json({ error: 'Access denied. Message belongs to different user.' });
  }

  if (projectId && message.agent.projectId !== projectId) {
    logger.warn({ agentId: message.agentId, messageId, userId, projectId, messageProjectId: message.agent.projectId }, 'ProjectId mismatch on delete message');
    return res.status(404).json({ error: 'Message not found in this project' });
  }

  await deleteMessageById(messageId);

  logger.debug({ agentId: message.agentId, messageId }, 'Message deleted successfully');
  res.status(204).send();
};

