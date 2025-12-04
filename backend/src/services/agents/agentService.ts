import { prisma } from '../../db/prisma';
import { withRetry } from '../../utils/prismaRetry';
import { syncProjectAgentsForProject } from '../projectTypeSync';

/**
 * Получить следующее значение order для нового агента пользователя
 */
export const getNextOrderValue = async (userId: string): Promise<number> => {
  const lastAgent = await withRetry(
    () => prisma.agent.findFirst({
      where: { userId },
      orderBy: { order: 'desc' },
      select: { order: true },
    }),
    3,
    'getNextOrderValue'
  );
  return (lastAgent?.order ?? -1) + 1;
};

/**
 * Найти агента по ID и userId
 */
export const findAgent = async (agentId: string, userId: string) => {
  return await withRetry(
    () => prisma.agent.findFirst({
      where: { id: agentId, userId },
    }),
    3,
    `findAgent - ${agentId}`
  );
};

/**
 * Синхронизировать агентов проекта
 */
export const syncProjectAgents = async (projectId: string): Promise<void> => {
  try {
    await syncProjectAgentsForProject(projectId);
  } catch (error: any) {
    throw new Error(`Failed to sync project agents: ${error.message}`);
  }
};

