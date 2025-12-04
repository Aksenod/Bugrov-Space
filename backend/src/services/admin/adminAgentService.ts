import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { withRetry } from '../../utils/prismaRetry';
import { logger } from '../../utils/logger';
import { syncProjectTypeAgents, syncProjectTypesForTemplate } from '../projectTypeSync';

/**
 * Создать агента-шаблон
 */
export const createAgentTemplate = async (data: {
  name: string;
  description?: string;
  systemInstruction?: string;
  summaryInstruction?: string;
  model?: string;
  role?: string;
  isHiddenFromSidebar?: boolean;
}) => {
  return await withRetry(
    () => (prisma as any).projectTypeAgent.create({
      data: {
        name: data.name,
        description: data.description || '',
        systemInstruction: data.systemInstruction || '',
        summaryInstruction: data.summaryInstruction || '',
        model: data.model || 'gpt-5-mini',
        role: data.role || '',
        isHiddenFromSidebar: data.isHiddenFromSidebar || false,
      },
    }),
    3,
    'createAgentTemplate'
  );
};

/**
 * Обновить агента-шаблон
 */
export const updateAgentTemplate = async (id: string, data: Partial<{
  name: string;
  description: string;
  systemInstruction: string;
  summaryInstruction: string;
  model: string;
  role: string;
  isHiddenFromSidebar: boolean;
}>) => {
  const updated = await withRetry(
    () => (prisma as any).projectTypeAgent.update({
      where: { id },
      data,
    }),
    3,
    `updateAgentTemplate - ${id}`
  );

  await syncProjectTypesForTemplate(id);
  return updated;
};

/**
 * Удалить агента-шаблон
 */
export const deleteAgentTemplate = async (id: string) => {
  // Загружаем связи с типами проектов перед удалением
  const projectTypeConnections = await withRetry(
    () => (prisma as any).projectTypeAgentProjectType.findMany({
      where: { projectTypeAgentId: id },
      select: { projectTypeId: true },
    }),
    3,
    `deleteAgentTemplate - load connections ${id}`
  ) as Array<{ projectTypeId?: string }>;

  const projectTypeIds = Array.from(
    new Set(
      projectTypeConnections
        .map((connection) => connection.projectTypeId)
        .filter((projectTypeId): projectTypeId is string => Boolean(projectTypeId))
    )
  );

  // Удаляем агента
  await withRetry(
    () => (prisma as any).projectTypeAgent.delete({
      where: { id },
    }),
    3,
    `deleteAgentTemplate - delete ${id}`
  );

  logger.info({ agentId: id }, 'Admin agent deleted');

  // Синхронизируем типы проектов
  for (const projectTypeId of projectTypeIds) {
    await syncProjectTypeAgents(projectTypeId);
  }

  return { projectTypeIds };
};

/**
 * Получить агента-шаблон по ID
 */
export const getAgentTemplate = async (id: string) => {
  return await withRetry(
    () => (prisma as any).projectTypeAgent.findUnique({
      where: { id },
    }),
    3,
    `getAgentTemplate - ${id}`
  );
};

/**
 * Получить всех агентов-шаблонов с их типами проектов
 */
export const getAllAgentTemplates = async () => {
  try {
    const [agentsList, connections] = await Promise.all([
      withRetry(
        () => (prisma as any).projectTypeAgent.findMany({
          orderBy: {
            createdAt: 'desc',
          },
        }),
        3,
        'getAllAgentTemplates - find agents'
      ) as Promise<any[]>,
      withRetry(
        () => (prisma as any).projectTypeAgentProjectType.findMany({
          include: {
            projectType: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        }),
        3,
        'getAllAgentTemplates - find connections'
      ) as Promise<any[]>,
    ]);

    // Группируем связи по agentId
    const connectionsByAgentId = connections.reduce((acc: any, conn: any) => {
      if (!acc[conn.projectTypeAgentId]) {
        acc[conn.projectTypeAgentId] = [];
      }
      acc[conn.projectTypeAgentId].push({
        projectType: conn.projectType,
        order: conn.order,
      });
      return acc;
    }, {});

    // Преобразуем данные для удобства фронтенда
    return agentsList.map((agent: any) => ({
      id: agent.id,
      name: agent.name,
      description: agent.description || '',
      systemInstruction: agent.systemInstruction || '',
      summaryInstruction: agent.summaryInstruction || '',
      model: agent.model || 'gpt-5.1',
      role: agent.role || '',
      isHiddenFromSidebar: agent.isHiddenFromSidebar || false,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
      projectTypes: (connectionsByAgentId[agent.id] || []).map((pt: any) => ({
        id: pt?.projectType?.id || '',
        name: pt?.projectType?.name || '',
        order: pt?.order || 0,
      })),
    }));
  } catch (error: any) {
    // Если таблица не существует, возвращаем пустой массив или агентов без связей
    if (error?.code === 'P2021' || 
        error?.message?.includes('does not exist') || 
        error?.message?.includes('relation') || 
        error?.message?.includes('column') ||
        error?.message?.includes('Unknown argument') ||
        error?.message?.includes('Unknown field')) {
      logger.warn({ error: error.message, code: error.code }, 'ProjectTypeAgentProjectType table may not exist, trying without relations');
      
      const agentsList = await withRetry(
        () => (prisma as any).projectTypeAgent.findMany({
          orderBy: {
            createdAt: 'desc',
          },
        }),
        3,
        'getAllAgentTemplates - without relations'
      ) as any[];

      return agentsList.map((agent: any) => ({
        id: agent.id,
        name: agent.name,
        description: agent.description || '',
        systemInstruction: agent.systemInstruction || '',
        summaryInstruction: agent.summaryInstruction || '',
        model: agent.model || 'gpt-5-mini',
        role: agent.role || '',
        isHiddenFromSidebar: agent.isHiddenFromSidebar || false,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
        projectTypes: [],
      }));
    }
    throw error;
  }
};

/**
 * Получить агента-шаблон с типами проектов
 */
export const getAgentTemplateWithProjectTypes = async (id: string) => {
  const [agent, connections] = await Promise.all([
    withRetry(
      () => (prisma as any).projectTypeAgent.findUnique({
        where: { id },
      }),
      3,
      `getAgentTemplateWithProjectTypes - find agent ${id}`
    ) as Promise<any>,
    withRetry(
      () => (prisma as any).projectTypeAgentProjectType.findMany({
        where: { projectTypeAgentId: id },
        include: {
          projectType: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          order: 'asc',
        },
      }),
      3,
      `getAgentTemplateWithProjectTypes - find connections ${id}`
    ) as Promise<any[]>,
  ]);

  if (!agent) {
    return null;
  }

  return {
    id: agent.id,
    name: agent.name,
    description: agent.description || '',
    systemInstruction: agent.systemInstruction || '',
    summaryInstruction: agent.summaryInstruction || '',
    model: agent.model || 'gpt-5-mini',
    role: agent.role || '',
    isHiddenFromSidebar: agent.isHiddenFromSidebar || false,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
    projectTypes: (connections || []).map((pt: any) => ({
      id: pt?.projectType?.id || '',
      name: pt?.projectType?.name || '',
      order: pt?.order || 0,
    })),
  };
};

