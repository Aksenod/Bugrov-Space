import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../db/prisma';
import { withRetry } from '../../utils/prismaRetry';
import { logger } from '../../utils/logger';
import { syncProjectAgentsForProject } from '../../services/projectTypeSync';
import { AuthenticatedRequest } from '../../types/express';

/**
 * Получить список агентов проекта
 */
export const getAgents = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthenticatedRequest;
  try {
    const userId = authReq.userId!;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const projectId = req.query.projectId as string | undefined;
    if (!projectId) {
      return res.status(400).json({ error: 'projectId обязателен' });
    }

    const project = await withRetry(
      () => prisma.project.findUnique({
        where: { id: projectId, userId },
        select: { id: true, projectTypeId: true },
      }),
      3,
      `GET /agents - find project ${projectId}`
    );

    if (!project) {
      return res.status(404).json({ error: 'Проект не найден' });
    }

    try {
      await syncProjectAgentsForProject(projectId);
    } catch (syncError: any) {
      logger.error(
        { projectId, error: syncError?.message },
        'Failed to sync project agents before GET /agents response'
      );
    }

    const agents = await withRetry(
      () => prisma.agent.findMany({
        where: { userId, projectId },
        include: {
          projectTypeAgent: {
            select: {
              isHiddenFromSidebar: true
            }
          }
        } as any,
        orderBy: [
          { order: 'asc' },
          { createdAt: 'asc' },
        ],
      }),
      3,
      `GET /agents?projectId=${projectId}`
    );

    // Загружаем агентов типа проекта, если проект найден
    let projectTypeAgents: any[] = [];
    if (project?.projectTypeId) {
      try {
        const connections = await withRetry(
          () => (prisma as any).projectTypeAgentProjectType.findMany({
            where: {
              projectTypeId: project.projectTypeId,
            },
            include: {
              projectTypeAgent: true,
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
          `GET /agents - find connections for ${project.projectTypeId}`
        ) as any[];

        logger.debug({
          projectTypeId: project.projectTypeId,
          connectionsCount: connections.length
        }, 'Found project type agent connections');

        projectTypeAgents = connections
          .filter((conn: any) => {
            const isValid = conn.projectTypeAgent &&
              conn.projectType &&
              conn.projectType.id === project.projectTypeId;
            if (!isValid) {
              logger.warn({
                connection: conn,
                projectTypeId: project.projectTypeId
              }, 'Filtered out invalid project type agent connection');
            }
            return isValid;
          })
          .map((conn: any, index: number) => ({
            ...conn.projectTypeAgent,
            order: conn.order ?? index,
            projectTypes: [{
              projectType: conn.projectType,
              order: conn.order ?? index,
            }],
          }));

        logger.debug({
          projectTypeId: project.projectTypeId,
          projectTypeAgentsCount: projectTypeAgents.length,
          agentIds: projectTypeAgents.map((a: any) => a.id)
        }, 'Filtered project type agents');
      } catch (error: any) {
        if (error?.code === 'P2021' ||
          error?.message?.includes('does not exist') ||
          error?.message?.includes('relation') ||
          error?.message?.includes('column') ||
          error?.message?.includes('Unknown argument') ||
          error?.message?.includes('Unknown field')) {
          logger.warn({
            projectTypeId: project.projectTypeId,
            error: error.message,
            code: error.code
          }, 'ProjectTypeAgent or ProjectTypeAgentProjectType table may not exist (migration not applied), returning empty array');
          projectTypeAgents = [];
        } else {
          logger.error({ error: error.message, stack: error.stack, code: error.code }, 'GET /agents - error loading projectTypeAgents');
          throw error;
        }
      }
    }

    const agentsWithEmptyFiles = agents.map(agent => {
      const isHidden = (agent as any).isHiddenFromSidebar || ((agent as any).projectTypeAgent?.isHiddenFromSidebar ?? false);
      return {
        ...agent,
        files: [],
        isHiddenFromSidebar: isHidden,
      };
    });

    logger.debug({ userId, agentsCount: agents.length, projectTypeAgentsCount: projectTypeAgents.length }, 'Agents loaded');

    res.json({
      agents: agentsWithEmptyFiles,
      projectTypeAgents: projectTypeAgents.length > 0 ? projectTypeAgents : undefined
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'GET /agents error');
    next(error);
  }
};

/**
 * Запретить мутацию агентов (только для админов)
 */
export const forbidAgentMutation = (res: Response) => {
  return res.status(403).json({ error: 'Управление агентами доступно только администратору' });
};

