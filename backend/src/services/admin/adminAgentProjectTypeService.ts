import { prisma } from '../../db/prisma';
import { withRetry } from '../../utils/prismaRetry';
import { logger } from '../../utils/logger';
import { syncProjectTypeAgents } from '../projectTypeSync';

/**
 * Получить типы проектов, к которым привязан агент
 */
export const getProjectTypes = async (agentId: string) => {
  const [agent, connections] = await Promise.all([
    withRetry(
      () => (prisma as any).projectTypeAgent.findUnique({
        where: { id: agentId },
      }),
      3,
      `getProjectTypes - find agent ${agentId}`
    ) as Promise<any>,
    withRetry(
      () => (prisma as any).projectTypeAgentProjectType.findMany({
        where: { projectTypeAgentId: agentId },
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
      `getProjectTypes - find connections ${agentId}`
    ) as Promise<any[]>,
  ]);

  if (!agent) {
    throw new Error('Агент не найден');
  }

  return (connections || []).map((pt: any) => ({
    id: pt?.projectType?.id || '',
    name: pt?.projectType?.name || '',
    order: pt?.order || 0,
  }));
};

/**
 * Привязать агента к типам проектов
 */
export const attachToProjectTypes = async (agentId: string, projectTypeIds: string[]) => {
  // Проверяем, что агент существует
  const agent = await withRetry(
    () => (prisma as any).projectTypeAgent.findUnique({
      where: { id: agentId },
    }),
    3,
    `attachToProjectTypes - find agent ${agentId}`
  );

  if (!agent) {
    throw new Error('Агент не найден');
  }

  // Проверяем, что все типы проектов существуют
  const projectTypes = await withRetry(
    () => prisma.projectType.findMany({
      where: {
        id: { in: projectTypeIds },
      },
    }),
    3,
    `attachToProjectTypes - find project types`
  );

  if (projectTypes.length !== projectTypeIds.length) {
    throw new Error('Один или несколько типов проектов не найдены');
  }

  // Загружаем существующие связи с их порядком перед удалением
  const existingConnections = await withRetry(
    () => (prisma as any).projectTypeAgentProjectType.findMany({
      where: { projectTypeAgentId: agentId },
      select: {
        projectTypeId: true,
        order: true,
      },
    }),
    3,
    `attachToProjectTypes - load existing connections ${agentId}`
  ) as Array<{ projectTypeId: string; order: number | null }>;

  // Создаем карту существующих порядков по projectTypeId
  const existingOrderMap = new Map<string, number>();
  existingConnections.forEach(conn => {
    if (conn.order !== null && conn.order !== undefined) {
      existingOrderMap.set(conn.projectTypeId, conn.order);
    }
  });

  // Для каждого типа проекта находим максимальный порядок среди всех агентов этого типа
  const maxOrderMap = new Map<string, number>();
  for (const projectTypeId of projectTypeIds) {
    const maxOrderResult = await withRetry(
      () => (prisma as any).projectTypeAgentProjectType.findFirst({
        where: { projectTypeId },
        orderBy: { order: 'desc' },
        select: { order: true },
      }),
      3,
      `attachToProjectTypes - find max order for ${projectTypeId}`
    ) as { order: number | null } | null;
    
    const maxOrder = maxOrderResult?.order ?? -1;
    maxOrderMap.set(projectTypeId, maxOrder);
  }

  // Удаляем существующие связи
  await withRetry(
    () => (prisma as any).projectTypeAgentProjectType.deleteMany({
      where: { projectTypeAgentId: agentId },
    }),
    3,
    `attachToProjectTypes - delete existing ${agentId}`
  );

  // Создаем новые связи, сохраняя существующий порядок или используя максимальный + 1
  const connections = projectTypeIds.map((projectTypeId) => {
    // Если связь уже существовала, сохраняем её порядок
    if (existingOrderMap.has(projectTypeId)) {
      return {
        projectTypeAgentId: agentId,
        projectTypeId,
        order: existingOrderMap.get(projectTypeId)!,
      };
    }
    // Для новой связи используем максимальный порядок + 1
    const maxOrder = maxOrderMap.get(projectTypeId) ?? -1;
    return {
      projectTypeAgentId: agentId,
      projectTypeId,
      order: maxOrder + 1,
    };
  });

  await withRetry(
    () => (prisma as any).projectTypeAgentProjectType.createMany({
      data: connections,
    }),
    3,
    `attachToProjectTypes - create connections ${agentId}`
  );

  logger.info({ agentId, projectTypeIds }, 'Agent attached to project types');

  // Синхронизируем типы проектов
  for (const projectTypeId of projectTypeIds) {
    await syncProjectTypeAgents(projectTypeId);
  }
};

/**
 * Отвязать агента от типа проекта
 */
export const detachFromProjectType = async (agentId: string, projectTypeId: string) => {
  // Проверяем, что агент существует
  const agent = await withRetry(
    () => (prisma as any).projectTypeAgent.findUnique({
      where: { id: agentId },
    }),
    3,
    `detachFromProjectType - find agent ${agentId}`
  );

  if (!agent) {
    throw new Error('Агент не найден');
  }

  // Удаляем связь
  await withRetry(
    () => (prisma as any).projectTypeAgentProjectType.deleteMany({
      where: {
        projectTypeAgentId: agentId,
        projectTypeId,
      },
    }),
    3,
    `detachFromProjectType - delete connection ${agentId}/${projectTypeId}`
  );

  logger.info({ agentId, projectTypeId }, 'Agent detached from project type');
  await syncProjectTypeAgents(projectTypeId);
};

