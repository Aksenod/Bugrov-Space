import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { withRetry } from '../../utils/prismaRetry';
import { logger } from '../../utils/logger';
import { cloneTemplateKnowledgeBase } from './knowledgeBaseService';
import { getNextOrderValue } from './agentService';

/**
 * Получить или создать агента из шаблона ProjectTypeAgent
 * 
 * @param agentId - ID агента или шаблона
 * @param userId - ID пользователя
 * @param projectId - ID проекта (обязателен для создания из шаблона)
 * @returns Агент или null, если не найден и не является шаблоном
 */
export const getOrCreateAgentFromTemplate = async (
  agentId: string,
  userId: string,
  projectId?: string
): Promise<any | null> => {
  logger.debug({ agentId, userId, projectId }, 'getOrCreateAgentFromTemplate - starting');

  // Сначала пытаемся найти агента в таблице Agent
  let agent = await withRetry(
    () => prisma.agent.findFirst({
      where: { id: agentId, userId },
    }),
    3,
    `getOrCreateAgentFromTemplate - find agent ${agentId}`
  );

  if (agent) {
    logger.debug({ agentId: agent.id, agentName: agent.name }, 'getOrCreateAgentFromTemplate - found existing agent');
    return agent;
  }

  logger.debug({ agentId }, 'getOrCreateAgentFromTemplate - agent not found, checking ProjectTypeAgent');

  // Если агент не найден, проверяем, является ли это ProjectTypeAgent
  try {
    const projectTypeAgent = await withRetry(
      () => (prisma as any).projectTypeAgent.findUnique({
        where: { id: agentId },
      }),
      3,
      `getOrCreateAgentFromTemplate - find project type agent ${agentId}`
    );

    if (!projectTypeAgent) {
      logger.debug({ agentId }, 'getOrCreateAgentFromTemplate - not a ProjectTypeAgent either');
      return null; // Не ProjectTypeAgent и не Agent
    }

    const template = projectTypeAgent as any;
    logger.debug({ agentId, templateName: template?.name }, 'getOrCreateAgentFromTemplate - found ProjectTypeAgent template');

    // Если это ProjectTypeAgent, но projectId не указан - возвращаем null
    // (не можем создать экземпляр без projectId)
    if (!projectId) {
      logger.debug({ agentId, templateName: template?.name }, 'getOrCreateAgentFromTemplate - projectId not provided, cannot create instance');
      return null;
    }

    // Проверяем, что проект принадлежит пользователю
    const project = await withRetry(
      () => prisma.project.findFirst({
        where: { id: projectId, userId },
      }),
      3,
      `getOrCreateAgentFromTemplate - verify project ${projectId}`
    );

    if (!project) {
      logger.warn({ agentId, projectId, userId }, 'getOrCreateAgentFromTemplate - project not found or does not belong to user');
      return null;
    }

    logger.debug({ agentId, projectId, templateName: template?.name }, 'getOrCreateAgentFromTemplate - project verified, checking for existing agent instance');

    if (!template || !template.name) {
      logger.warn({ agentId, template }, 'getOrCreateAgentFromTemplate - invalid template data (missing name)');
      return null;
    }

    // Проверяем, не был ли уже создан агент из этого шаблона для данного проекта
    const existingAgent = await withRetry(
      () => prisma.agent.findFirst({
        where: {
          userId,
          projectId: projectId,
          name: template.name,
        },
      }),
      3,
      `getOrCreateAgentFromTemplate - check existing agent`
    );

    if (existingAgent) {
      logger.debug({
        agentId: existingAgent.id,
        templateId: agentId,
        templateName: template.name,
        projectId
      }, 'getOrCreateAgentFromTemplate - found existing agent instance from template');
      return existingAgent;
    }

    logger.debug({ agentId, templateName: template.name, projectId }, 'getOrCreateAgentFromTemplate - no existing instance found, creating new one');

    // Создаем новый экземпляр агента проекта из шаблона
    const nextOrder = await getNextOrderValue(userId);

    const agentData: Prisma.AgentUncheckedCreateInput & { projectTypeAgentId?: string | null } = {
      userId,
      projectId: projectId,
      projectTypeAgentId: template.id,
      name: template.name,
      description: template.description ?? '',
      systemInstruction: template.systemInstruction ?? '',
      summaryInstruction: template.summaryInstruction ?? '',
      model: template.model ?? 'gpt-5-mini',
      role: template.role ?? '',
      order: nextOrder,
    };

    agent = await withRetry(
      () => prisma.agent.create({
        data: agentData,
      }),
      3,
      `getOrCreateAgentFromTemplate - create agent from template`
    );
    await cloneTemplateKnowledgeBase(template.id, agent.id);

    logger.info({
      newAgentId: agent.id,
      templateId: agentId,
      projectId: projectId,
      userId,
      agentName: agent.name
    }, 'getOrCreateAgentFromTemplate - created new agent instance from ProjectTypeAgent template');

    return agent;
  } catch (error: any) {
    logger.error({
      agentId,
      userId,
      projectId,
      error: error.message,
      code: error.code,
      stack: error.stack
    }, 'getOrCreateAgentFromTemplate - failed to get or create agent from template');
    return null;
  }
};

