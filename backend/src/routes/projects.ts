import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../types/express';
import { asyncHandler } from '../middleware/errorHandler';
import { withRetry } from '../utils/prismaRetry';

const router = Router();

const projectSchema = z.object({
  name: z.string().min(1, 'Название проекта обязательно').max(50, 'Название проекта не может быть длиннее 50 символов'),
  description: z.string().max(500, 'Описание не может быть длиннее 500 символов').optional(),
  projectTypeId: z.string().min(1, 'Тип проекта обязателен'),
});

const updateProjectSchema = z.object({
  name: z.string().min(1, 'Название проекта обязательно').max(50, 'Название проекта не может быть длиннее 50 символов').optional(),
  description: z.string().max(500, 'Описание не может быть длиннее 500 символов').optional().nullable(),
});

// GET / - получить все проекты пользователя
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.userId!;

  const projects = await withRetry(
    () => prisma.project.findMany({
      where: { userId },
      include: {
        _count: {
          select: { agents: true },
        },
        projectType: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    3,
    'GET /projects'
  );

  const projectsWithCount = projects.map(project => ({
    id: project.id,
    name: project.name,
    description: project.description,
    projectTypeId: project.projectTypeId,
    projectType: project.projectType,
    agentCount: project._count.agents,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  }));

  logger.debug({ userId, projectsCount: projectsWithCount.length }, 'Projects fetched');
  res.json({ projects: projectsWithCount });
}));

// GET /:id - получить конкретный проект
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.userId!;
  const { id } = req.params;

  const project = await withRetry(
    () => prisma.project.findFirst({
      where: { id, userId },
      include: {
        _count: {
          select: { agents: true },
        },
        projectType: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    3,
    `GET /projects/${id}`
  );

  if (!project) {
    return res.status(404).json({ error: 'Проект не найден' });
  }

  res.json({
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      projectTypeId: project.projectTypeId,
      projectType: project.projectType,
      agentCount: project._count.agents,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    },
  });
}));

// POST / - создать новый проект
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.userId!;

  const parsed = projectSchema.safeParse(req.body);
  if (!parsed.success) {
    const errorMessages = parsed.error.issues.map((err) => {
      if (err.path.length > 0) {
        return `${err.path.join('.')}: ${err.message}`;
      }
      return err.message;
    }).join(', ');
    return res.status(400).json({ error: `Validation error: ${errorMessages}` });
  }

  const { name, description, projectTypeId } = parsed.data;

  // Проверяем, что тип проекта существует
  const projectType = await withRetry(
    () => prisma.projectType.findUnique({
      where: { id: projectTypeId },
    }),
    3,
    'POST /projects - find projectType'
  );

  if (!projectType) {
    return res.status(404).json({ error: 'Тип проекта не найден' });
  }

  const project = await withRetry(
    () => prisma.project.create({
      data: {
        name,
        description: description || null,
        userId,
        projectTypeId,
      },
      include: {
        _count: {
          select: { agents: true },
        },
        projectType: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    3,
    'POST /projects - create project'
  );

  logger.info({ userId, projectId: project.id, name, projectTypeId }, 'Project created');
  res.status(201).json({
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      projectTypeId: project.projectTypeId,
      projectType: project.projectType,
      agentCount: project._count.agents,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    },
  });
}));

// PUT /:id - обновить проект
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.userId!;
  const { id } = req.params;

  const parsed = updateProjectSchema.safeParse(req.body);
  if (!parsed.success) {
    const errorMessages = parsed.error.issues.map((err) => {
      if (err.path.length > 0) {
        return `${err.path.join('.')}: ${err.message}`;
      }
      return err.message;
    }).join(', ');
    return res.status(400).json({ error: `Validation error: ${errorMessages}` });
  }

  // Проверяем, что проект принадлежит пользователю
  const existing = await withRetry(
    () => prisma.project.findFirst({
      where: { id, userId },
    }),
    3,
    `PUT /projects/${id} - find existing`
  );

  if (!existing) {
    return res.status(404).json({ error: 'Проект не найден' });
  }

  const updateData: { name?: string; description?: string | null } = {};
  if (parsed.data.name !== undefined) {
    updateData.name = parsed.data.name;
  }
  if (parsed.data.description !== undefined) {
    updateData.description = parsed.data.description || null;
  }

  const updated = await withRetry(
    () => prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: { agents: true },
        },
        projectType: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    3,
    `PUT /projects/${id} - update`
  );

  logger.info({ userId, projectId: id, updates: updateData }, 'Project updated');
  res.json({
    project: {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      projectTypeId: updated.projectTypeId,
      projectType: updated.projectType,
      agentCount: updated._count.agents,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    },
  });
}));

// DELETE /:id - удалить проект
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.userId!;
  const { id } = req.params;

  // Проверяем, что проект принадлежит пользователю
  const existing = await withRetry(
    () => prisma.project.findFirst({
      where: { id, userId },
      include: {
        _count: {
          select: { agents: true },
        },
      },
    }),
    3,
    `DELETE /projects/${id} - find existing`
  );

  if (!existing) {
    return res.status(404).json({ error: 'Проект не найден' });
  }

  try {
    // Проект можно удалить - каскадное удаление агентов происходит автоматически
    // благодаря onDelete: Cascade в схеме для Agent -> Project
    await withRetry(
      () => prisma.project.delete({
        where: { id },
      }),
      3,
      `DELETE /projects/${id} - delete`
    );

    logger.info({ userId, projectId: id, agentCount: existing._count.agents }, 'Project deleted (with cascade delete of agents)');
    res.status(204).send();
  } catch (error: any) {
    // Обрабатываем возможные ошибки базы данных
    if (error?.code === 'P2014') {
      // Foreign key constraint violation - не должно происходить при правильной схеме
      logger.error({ userId, projectId: id, error: error.message }, 'Failed to delete project: foreign key constraint violation');
      return res.status(500).json({ 
        error: 'Не удалось удалить проект из-за ограничений базы данных',
        message: 'Пожалуйста, попробуйте позже или обратитесь к администратору'
      });
    }
    // Пробрасываем другие ошибки для обработки в errorHandler
    throw error;
  }
}));

export default router;

