import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';
import { withRetry } from '../utils/prismaRetry';
import { env } from '../env';

const router = Router();

const agentTemplateSchema = z.object({
  name: z.string().min(1, 'Название агента обязательно'),
  description: z.string().optional().default(''),
  systemInstruction: z.string().optional().default(''),
  summaryInstruction: z.string().optional().default(''),
  model: z.string().optional().default('gpt-5.1'),
  role: z.string().optional().default(''),
});

// GET / - получить все агенты-шаблоны
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    let agents: any[];
    
    try {
      agents = await withRetry(
        () => (prisma as any).projectTypeAgent.findMany({
          include: {
            projectTypes: {
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
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        3,
        'GET /admin/agents'
      ) as any[];
    } catch (error: any) {
      // Если таблица не существует (миграция не применена), пробуем без include
      if (error?.code === 'P2021' || error?.message?.includes('does not exist') || error?.message?.includes('relation') || error?.message?.includes('column')) {
        logger.warn({ error: error.message, code: error.code }, 'ProjectTypeAgentProjectType table may not exist, trying without relations');
        try {
          agents = await withRetry(
            () => (prisma as any).projectTypeAgent.findMany({
              orderBy: {
                createdAt: 'desc',
              },
            }),
            3,
            'GET /admin/agents - without relations'
          ) as any[];
        } catch (innerError: any) {
          // Если и основная таблица не существует, возвращаем пустой массив
          if (innerError?.code === 'P2021' || innerError?.message?.includes('does not exist') || innerError?.message?.includes('relation')) {
            logger.warn('ProjectTypeAgent table does not exist, returning empty array');
            return res.json({ agents: [] });
          }
          throw innerError;
        }
      } else {
        throw error;
      }
    }

    // Преобразуем данные для удобства фронтенда
    const agentsWithProjectTypes = agents.map((agent: any) => ({
      id: agent.id,
      name: agent.name,
      description: agent.description || '',
      systemInstruction: agent.systemInstruction || '',
      summaryInstruction: agent.summaryInstruction || '',
      model: agent.model || 'gpt-5.1',
      role: agent.role || '',
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
      projectTypes: (agent.projectTypes || []).map((pt: any) => ({
        id: pt?.projectType?.id || pt?.projectTypeId,
        name: pt?.projectType?.name || '',
        order: pt?.order || 0,
      })),
    }));

    logger.debug({ agentsCount: agentsWithProjectTypes.length }, 'Admin agents fetched');
    res.json({ agents: agentsWithProjectTypes });
  } catch (error: any) {
    // Детальное логирование для диагностики
    logger.error({ 
      error: error.message, 
      stack: error.stack, 
      code: error.code, 
      meta: error.meta,
      name: error.name,
      cause: error.cause
    }, 'GET /admin/agents error');
    
    // Если это ошибка Prisma о несуществующей таблице, возвращаем понятное сообщение
    if (error?.code === 'P2021' || 
        error?.message?.includes('does not exist') || 
        error?.message?.includes('relation') ||
        error?.message?.includes('column')) {
      return res.status(500).json({
        error: 'Database migration required',
        message: 'The database tables have not been created. Please ensure migrations are applied.',
        details: env.nodeEnv === 'development' ? error.message : undefined
      });
    }
    
    throw error;
  }
}));

// GET /:id - получить конкретный агент-шаблон
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const agent = await withRetry(
    () => (prisma as any).projectTypeAgent.findUnique({
      where: { id },
      include: {
        projectTypes: {
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
        },
      },
    }),
    3,
    `GET /admin/agents/${id}`
  ) as any;

  if (!agent) {
    return res.status(404).json({ error: 'Агент не найден' });
  }

  const agentWithProjectTypes = {
    id: agent.id,
    name: agent.name,
    description: agent.description || '',
    systemInstruction: agent.systemInstruction || '',
    summaryInstruction: agent.summaryInstruction || '',
    model: agent.model || 'gpt-5.1',
    role: agent.role || '',
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
    projectTypes: (agent.projectTypes || []).map((pt: any) => ({
      id: pt?.projectType?.id || pt?.projectTypeId,
      name: pt?.projectType?.name || '',
      order: pt?.order || 0,
    })),
  };

  res.json({ agent: agentWithProjectTypes });
}));

// POST / - создать новый агент-шаблон
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    const parsed = agentTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMessages = parsed.error.issues.map((err) => {
        if (err.path.length > 0) {
          return `${err.path.join('.')}: ${err.message}`;
        }
        return err.message;
      }).join(', ');
      return res.status(400).json({ error: `Validation error: ${errorMessages}` });
    }

    const { name, description, systemInstruction, summaryInstruction, model, role } = parsed.data;

    let agent: any;
    try {
      agent = await withRetry(
        () => (prisma as any).projectTypeAgent.create({
          data: {
            name,
            description: description || '',
            systemInstruction: systemInstruction || '',
            summaryInstruction: summaryInstruction || '',
            model: model || 'gpt-5.1',
            role: role || '',
          },
        }),
        3,
        'POST /admin/agents - create'
      );
    } catch (error: any) {
      // Если таблица не существует (миграция не применена)
      if (error?.code === 'P2021' || 
          error?.message?.includes('does not exist') || 
          error?.message?.includes('relation') ||
          error?.message?.includes('column')) {
        logger.error({ 
          error: error.message, 
          code: error.code,
          meta: error.meta,
          stack: error.stack 
        }, 'ProjectTypeAgent table does not exist. Migration may not be applied.');
        return res.status(500).json({ 
          error: 'Database migration not applied',
          message: 'The ProjectTypeAgent table does not exist. Please ensure migrations are deployed.',
          details: env.nodeEnv === 'development' ? error.message : undefined
        });
      }
      logger.error({ 
        error: error.message, 
        code: error.code,
        meta: error.meta,
        stack: error.stack 
      }, 'POST /admin/agents - unexpected error');
      throw error;
    }

    logger.info({ agentId: (agent as any).id, name }, 'Admin agent created');
    res.status(201).json({ agent });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack, code: error.code, meta: error.meta }, 'POST /admin/agents error');
    throw error;
  }
}));

// PUT /:id - обновить агент-шаблон
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const parsed = agentTemplateSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    const errorMessages = parsed.error.issues.map((err) => {
      if (err.path.length > 0) {
        return `${err.path.join('.')}: ${err.message}`;
      }
      return err.message;
    }).join(', ');
    return res.status(400).json({ error: `Validation error: ${errorMessages}` });
  }

  // Проверяем, что агент существует
  const existing = await withRetry(
    () => (prisma as any).projectTypeAgent.findUnique({
      where: { id },
    }),
    3,
    `PUT /admin/agents/${id} - find existing`
  );

  if (!existing) {
    return res.status(404).json({ error: 'Агент не найден' });
  }

  const updated = await withRetry(
    () => (prisma as any).projectTypeAgent.update({
      where: { id },
      data: parsed.data,
    }),
    3,
    `PUT /admin/agents/${id} - update`
  );

  logger.info({ agentId: id }, 'Admin agent updated');
  res.json({ agent: updated });
}));

// DELETE /:id - удалить агент-шаблон
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Проверяем, что агент существует
  const existing = await withRetry(
    () => (prisma as any).projectTypeAgent.findUnique({
      where: { id },
    }),
    3,
    `DELETE /admin/agents/${id} - find existing`
  );

  if (!existing) {
    return res.status(404).json({ error: 'Агент не найден' });
  }

  await withRetry(
    () => (prisma as any).projectTypeAgent.delete({
      where: { id },
    }),
    3,
    `DELETE /admin/agents/${id} - delete`
  );

  logger.info({ agentId: id }, 'Admin agent deleted');
  res.status(204).send();
}));

// GET /:id/project-types - получить типы проектов, к которым привязан агент
router.get('/:id/project-types', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const agent = await withRetry(
    () => (prisma as any).projectTypeAgent.findUnique({
      where: { id },
      include: {
        projectTypes: {
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
        },
      },
    }),
    3,
    `GET /admin/agents/${id}/project-types`
  ) as any;

  if (!agent) {
    return res.status(404).json({ error: 'Агент не найден' });
  }

  const projectTypes = (agent.projectTypes || []).map((pt: any) => ({
    id: pt?.projectType?.id || pt?.projectTypeId,
    name: pt?.projectType?.name || '',
    order: pt?.order || 0,
  }));

  res.json({ projectTypes });
}));

// POST /:id/project-types - привязать агента к типам проектов
router.post('/:id/project-types', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const schema = z.object({
    projectTypeIds: z.array(z.string().min(1)).min(1, 'Необходимо указать хотя бы один тип проекта'),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    const errorMessages = parsed.error.issues.map((err) => {
      if (err.path.length > 0) {
        return `${err.path.join('.')}: ${err.message}`;
      }
      return err.message;
    }).join(', ');
    return res.status(400).json({ error: `Validation error: ${errorMessages}` });
  }

  const { projectTypeIds } = parsed.data;

  // Проверяем, что агент существует
  const agent = await withRetry(
    () => (prisma as any).projectTypeAgent.findUnique({
      where: { id },
    }),
    3,
    `POST /admin/agents/${id}/project-types - find agent`
  );

  if (!agent) {
    return res.status(404).json({ error: 'Агент не найден' });
  }

  // Проверяем, что все типы проектов существуют
  const projectTypes = await withRetry(
    () => prisma.projectType.findMany({
      where: {
        id: { in: projectTypeIds },
      },
    }),
    3,
    `POST /admin/agents/${id}/project-types - find project types`
  );

  if (projectTypes.length !== projectTypeIds.length) {
    return res.status(404).json({ error: 'Один или несколько типов проектов не найдены' });
  }

  // Удаляем существующие связи
  await withRetry(
    () => (prisma as any).projectTypeAgentProjectType.deleteMany({
      where: { projectTypeAgentId: id },
    }),
    3,
    `POST /admin/agents/${id}/project-types - delete existing`
  );

  // Создаем новые связи
  const connections = projectTypeIds.map((projectTypeId, index) => ({
    projectTypeAgentId: id,
    projectTypeId,
    order: index,
  }));

  await withRetry(
    () => (prisma as any).projectTypeAgentProjectType.createMany({
      data: connections,
    }),
    3,
    `POST /admin/agents/${id}/project-types - create connections`
  );

  logger.info({ agentId: id, projectTypeIds }, 'Agent attached to project types');
  res.json({ success: true });
}));

// DELETE /:id/project-types/:projectTypeId - отвязать агента от типа проекта
router.delete('/:id/project-types/:projectTypeId', asyncHandler(async (req: Request, res: Response) => {
  const { id, projectTypeId } = req.params;

  // Проверяем, что агент существует
  const agent = await withRetry(
    () => (prisma as any).projectTypeAgent.findUnique({
      where: { id },
    }),
    3,
    `DELETE /admin/agents/${id}/project-types/${projectTypeId} - find agent`
  );

  if (!agent) {
    return res.status(404).json({ error: 'Агент не найден' });
  }

  // Удаляем связь
  await withRetry(
    () => (prisma as any).projectTypeAgentProjectType.deleteMany({
      where: {
        projectTypeAgentId: id,
        projectTypeId,
      },
    }),
    3,
    `DELETE /admin/agents/${id}/project-types/${projectTypeId} - delete connection`
  );

  logger.info({ agentId: id, projectTypeId }, 'Agent detached from project type');
  res.status(204).send();
}));

export default router;

