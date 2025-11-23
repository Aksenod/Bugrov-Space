import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../types/express';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

const projectSchema = z.object({
  name: z.string().min(1, 'Название проекта обязательно').max(50, 'Название проекта не может быть длиннее 50 символов'),
  description: z.string().max(500, 'Описание не может быть длиннее 500 символов').optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1, 'Название проекта обязательно').max(50, 'Название проекта не может быть длиннее 50 символов').optional(),
  description: z.string().max(500, 'Описание не может быть длиннее 500 символов').optional().nullable(),
});

// GET / - получить все проекты пользователя
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.userId;

  const projects = await prisma.project.findMany({
    where: { userId },
    include: {
      _count: {
        select: { agents: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const projectsWithCount = projects.map(project => ({
    id: project.id,
    name: project.name,
    description: project.description,
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
  const userId = authReq.userId;
  const { id } = req.params;

  const project = await prisma.project.findFirst({
    where: { id, userId },
    include: {
      _count: {
        select: { agents: true },
      },
    },
  });

  if (!project) {
    return res.status(404).json({ error: 'Проект не найден' });
  }

  res.json({
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      agentCount: project._count.agents,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    },
  });
}));

// POST / - создать новый проект
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.userId;

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

  const { name, description } = parsed.data;

  const project = await prisma.project.create({
    data: {
      name,
      description: description || null,
      userId,
    },
    include: {
      _count: {
        select: { agents: true },
      },
    },
  });

  logger.info({ userId, projectId: project.id, name }, 'Project created');
  res.status(201).json({
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      agentCount: project._count.agents,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    },
  });
}));

// PUT /:id - обновить проект
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.userId;
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
  const existing = await prisma.project.findFirst({
    where: { id, userId },
  });

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

  const updated = await prisma.project.update({
    where: { id },
    data: updateData,
    include: {
      _count: {
        select: { agents: true },
      },
    },
  });

  logger.info({ userId, projectId: id, updates: updateData }, 'Project updated');
  res.json({
    project: {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      agentCount: updated._count.agents,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    },
  });
}));

// DELETE /:id - удалить проект
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.userId;
  const { id } = req.params;

  // Проверяем, что проект принадлежит пользователю
  const existing = await prisma.project.findFirst({
    where: { id, userId },
    include: {
      _count: {
        select: { agents: true },
      },
    },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Проект не найден' });
  }

  // Проект можно удалить в любом случае - каскадное удаление агентов
  await prisma.project.delete({
    where: { id },
  });

  logger.info({ userId, projectId: id }, 'Project deleted (with cascade delete of agents)');
  res.status(204).send();
}));

export default router;

