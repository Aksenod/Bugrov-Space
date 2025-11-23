import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

const projectTypeSchema = z.object({
  name: z.string().min(1, 'Название типа проекта обязательно').max(50, 'Название типа проекта не может быть длиннее 50 символов'),
});

// GET / - получить все типы проектов (публичный эндпоинт)
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const projectTypes = await prisma.projectType.findMany({
    orderBy: { name: 'asc' },
  });

  logger.debug({ projectTypesCount: projectTypes.length }, 'Project types fetched');
  res.json({ projectTypes });
}));

// GET /:id - получить конкретный тип проекта
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const projectType = await prisma.projectType.findUnique({
    where: { id },
  });

  if (!projectType) {
    return res.status(404).json({ error: 'Тип проекта не найден' });
  }

  res.json({ projectType });
}));

// POST / - создать новый тип проекта (только для админов, но пока без проверки)
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const parsed = projectTypeSchema.safeParse(req.body);
  if (!parsed.success) {
    const errorMessages = parsed.error.issues.map((err) => {
      if (err.path.length > 0) {
        return `${err.path.join('.')}: ${err.message}`;
      }
      return err.message;
    }).join(', ');
    return res.status(400).json({ error: `Validation error: ${errorMessages}` });
  }

  const { name } = parsed.data;

  // Проверяем, что тип проекта с таким именем не существует
  const existing = await prisma.projectType.findUnique({
    where: { name },
  });

  if (existing) {
    return res.status(409).json({ error: 'Тип проекта с таким именем уже существует' });
  }

  const projectType = await prisma.projectType.create({
    data: { name },
  });

  logger.info({ projectTypeId: projectType.id, name }, 'Project type created');
  res.status(201).json({ projectType });
}));

// PUT /:id - обновить тип проекта
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const parsed = projectTypeSchema.safeParse(req.body);
  if (!parsed.success) {
    const errorMessages = parsed.error.issues.map((err) => {
      if (err.path.length > 0) {
        return `${err.path.join('.')}: ${err.message}`;
      }
      return err.message;
    }).join(', ');
    return res.status(400).json({ error: `Validation error: ${errorMessages}` });
  }

  const { name } = parsed.data;

  // Проверяем, что тип проекта существует
  const existing = await prisma.projectType.findUnique({
    where: { id },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Тип проекта не найден' });
  }

  // Проверяем, что тип проекта с таким именем не существует (если имя изменилось)
  if (name !== existing.name) {
    const duplicate = await prisma.projectType.findUnique({
      where: { name },
    });

    if (duplicate) {
      return res.status(409).json({ error: 'Тип проекта с таким именем уже существует' });
    }
  }

  const updated = await prisma.projectType.update({
    where: { id },
    data: { name },
  });

  logger.info({ projectTypeId: id, name }, 'Project type updated');
  res.json({ projectType: updated });
}));

// DELETE /:id - удалить тип проекта
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Проверяем, что тип проекта существует
  const existing = await prisma.projectType.findUnique({
    where: { id },
    include: {
      _count: {
        select: { projects: true },
      },
    },
  });

  if (!existing) {
    return res.status(404).json({ error: 'Тип проекта не найден' });
  }

  // Проверяем, что нет проектов с этим типом
  if (existing._count.projects > 0) {
    return res.status(409).json({ 
      error: 'Нельзя удалить тип проекта, так как существуют проекты с этим типом',
      message: `Существует ${existing._count.projects} проект(ов) с этим типом`
    });
  }

  await prisma.projectType.delete({
    where: { id },
  });

  logger.info({ projectTypeId: id }, 'Project type deleted');
  res.status(204).send();
}));

export default router;
