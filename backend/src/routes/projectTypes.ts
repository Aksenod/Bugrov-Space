import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';
import { withRetry } from '../utils/prismaRetry';
import { syncProjectTypeAgents } from '../services/projectTypeSync';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';
import { AuthenticatedRequest } from '../types/express';
import { verifyToken } from '../utils/token';

const router = Router();

const ADMIN_USERNAMES = new Set(['admin', 'aksenod']);

const projectTypeSchema = z.object({
  name: z.string().min(1, 'Название типа проекта обязательно').max(50, 'Название типа проекта не может быть длиннее 50 символов'),
  isAdminOnly: z.boolean().optional().default(false),
});

const reorderAgentsSchema = z.object({
  orders: z.array(z.object({
    id: z.string().min(1),
    order: z.number().int(),
  })).min(1),
});

// Вспомогательная функция для проверки, является ли пользователь администратором
async function isUserAdmin(userId: string | undefined): Promise<boolean> {
  if (!userId) {
    return false;
  }

  try {
    const user = await withRetry(
      () =>
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            username: true,
            role: true,
          },
        }),
      2,
      'isUserAdmin.findUser',
    );

    if (!user) {
      return false;
    }

    const role = user.role?.trim().toLowerCase();
    return role === 'admin' || (user.username && ADMIN_USERNAMES.has(user.username));
  } catch (error) {
    logger.error({ error, userId }, 'Error checking if user is admin');
    return false;
  }
}

// GET / - получить типы проектов с фильтрацией по isAdminOnly
// Публичный эндпоинт, но если пользователь аутентифицирован и является администратором,
// возвращаются все типы, иначе только публичные (isAdminOnly = false)
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  // Опциональная проверка авторизации: если токен есть, проверяем роль
  const header = req.headers.authorization;
  let userId: string | undefined;
  
  if (header) {
    try {
      const token = header.replace('Bearer ', '');
      const payload = verifyToken(token);
      userId = payload.userId;
    } catch {
      // Невалидный токен - продолжаем как неавторизованный пользователь
    }
  }

  const isAdmin = await isUserAdmin(userId);

  const where = isAdmin ? {} : { isAdminOnly: false };

  const projectTypes = await withRetry(
    () => prisma.projectType.findMany({
      where,
      orderBy: { name: 'asc' },
    }),
    3,
    'GET /project-types'
  );

  logger.debug({ projectTypesCount: projectTypes.length, isAdmin, userId }, 'Project types fetched');
  res.json({ projectTypes });
}));

// GET /:id - получить конкретный тип проекта
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const projectType = await withRetry(
    () => prisma.projectType.findUnique({
      where: { id },
    }),
    3,
    `GET /project-types/${id}`
  );

  if (!projectType) {
    return res.status(404).json({ error: 'Тип проекта не найден' });
  }

  res.json({ projectType });
}));

// POST / - создать новый тип проекта (только для админов, но пока без проверки)
router.post('/', authMiddleware, adminMiddleware, asyncHandler(async (req: Request, res: Response) => {
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

  const { name, isAdminOnly } = parsed.data;

  // Проверяем, что тип проекта с таким именем не существует
  const existing = await withRetry(
    () => prisma.projectType.findUnique({
      where: { name },
    }),
    3,
    'POST /project-types - check existing'
  );

  if (existing) {
    return res.status(409).json({ error: 'Тип проекта с таким именем уже существует' });
  }

  const projectType = await withRetry(
    () => prisma.projectType.create({
      data: { name, isAdminOnly: isAdminOnly ?? false },
    }),
    3,
    'POST /project-types - create'
  );

  logger.info({ projectTypeId: projectType.id, name }, 'Project type created');
  res.status(201).json({ projectType });
}));

// PUT /:id - обновить тип проекта
router.put('/:id', authMiddleware, adminMiddleware, asyncHandler(async (req: Request, res: Response) => {
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

  const { name, isAdminOnly } = parsed.data;

  // Проверяем, что тип проекта существует
  const existing = await withRetry(
    () => prisma.projectType.findUnique({
      where: { id },
    }),
    3,
    `PUT /project-types/${id} - find existing`
  );

  if (!existing) {
    return res.status(404).json({ error: 'Тип проекта не найден' });
  }

  // Проверяем, что тип проекта с таким именем не существует (если имя изменилось)
  if (name !== existing.name) {
    const duplicate = await withRetry(
      () => prisma.projectType.findUnique({
        where: { name },
      }),
      3,
      `PUT /project-types/${id} - check duplicate`
    );

    if (duplicate) {
      return res.status(409).json({ error: 'Тип проекта с таким именем уже существует' });
    }
  }

  const updated = await withRetry(
    () => prisma.projectType.update({
      where: { id },
      data: { 
        name,
        isAdminOnly: isAdminOnly !== undefined ? isAdminOnly : existing.isAdminOnly,
      },
    }),
    3,
    `PUT /project-types/${id} - update`
  );

  logger.info({ projectTypeId: id, name }, 'Project type updated');
  res.json({ projectType: updated });
}));

// DELETE /:id - удалить тип проекта
router.delete('/:id', authMiddleware, adminMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Проверяем, что тип проекта существует
  const existing = await withRetry(
    () => prisma.projectType.findUnique({
      where: { id },
      include: {
        _count: {
          select: { projects: true },
        },
      },
    }),
    3,
    `DELETE /project-types/${id} - find existing`
  );

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

  await withRetry(
    () => prisma.projectType.delete({
      where: { id },
    }),
    3,
    `DELETE /project-types/${id} - delete`
  );

  logger.info({ projectTypeId: id }, 'Project type deleted');
  res.status(204).send();
}));

// GET /:id/agents - получить агентов типа проекта (требует аутентификации)
router.get('/:id/agents', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Проверяем, что тип проекта существует
  const projectType = await withRetry(
    () => prisma.projectType.findUnique({
      where: { id },
    }),
    3,
    `GET /project-types/${id}/agents - find projectType`
  );

  if (!projectType) {
    return res.status(404).json({ error: 'Тип проекта не найден' });
  }

  // Загружаем агентов типа проекта через промежуточную таблицу
  const agentConnections = await withRetry(
    () => (prisma as any).projectTypeAgentProjectType.findMany({
      where: { projectTypeId: id },
      include: {
        projectTypeAgent: true,
      },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'asc' },
      ],
    }),
    3,
    `GET /project-types/${id}/agents - find agents`
  ) as any[];

  // Преобразуем в формат, совместимый со старым API
  const agents = agentConnections.map((connection: any, index: number) => ({
    id: connection.projectTypeAgent.id,
    name: connection.projectTypeAgent.name,
    description: connection.projectTypeAgent.description,
    systemInstruction: connection.projectTypeAgent.systemInstruction,
    summaryInstruction: connection.projectTypeAgent.summaryInstruction,
    model: connection.projectTypeAgent.model,
    role: connection.projectTypeAgent.role,
    order: connection.order ?? index, // Используем index как fallback если order отсутствует
    createdAt: connection.projectTypeAgent.createdAt,
    updatedAt: connection.projectTypeAgent.updatedAt,
  }));

  res.json({ agents });
}));

// POST /:id/agents/reorder - изменить порядок агентов типа проекта
router.post('/:id/agents/reorder', authMiddleware, adminMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Проверяем, что тип проекта существует
  const projectType = await withRetry(
    () => prisma.projectType.findUnique({
      where: { id },
    }),
    3,
    `POST /project-types/${id}/agents/reorder - find projectType`
  );

  if (!projectType) {
    return res.status(404).json({ error: 'Тип проекта не найден' });
  }

  // Валидация входных данных
  const parsed = reorderAgentsSchema.safeParse(req.body);
  if (!parsed.success) {
    const errorMessages = parsed.error.issues.map((err) => {
      if (err.path.length > 0) {
        return `${err.path.join('.')}: ${err.message}`;
      }
      return err.message;
    }).join(', ');
    return res.status(400).json({ error: `Validation error: ${errorMessages}` });
  }

  const orders = parsed.data.orders;
  const agentIds = orders.map((order) => order.id);

  // Проверяем, что все агенты привязаны к этому типу проекта
  const agentConnections = await withRetry(
    () => (prisma as any).projectTypeAgentProjectType.findMany({
      where: {
        projectTypeId: id,
        projectTypeAgentId: { in: agentIds },
      },
      select: { projectTypeAgentId: true },
    }),
    3,
    `POST /project-types/${id}/agents/reorder - find connections`
  ) as any[];

  if (agentConnections.length !== agentIds.length) {
    return res.status(400).json({
      error: 'Один или несколько агентов не привязаны к этому типу проекта'
    });
  }

  // Обновляем порядок для каждого агента
  const updates = orders.map(({ id: agentId, order }) =>
    (prisma as any).projectTypeAgentProjectType.updateMany({
      where: {
        projectTypeId: id,
        projectTypeAgentId: agentId,
      },
      data: { order },
    })
  );

  await withRetry(
    () => prisma.$transaction(updates),
    3,
    `POST /project-types/${id}/agents/reorder - transaction`
  );

  logger.info({ projectTypeId: id, ordersCount: orders.length }, 'Project type agents reordered');
  // Не вызываем syncProjectTypeAgents здесь, так как порядок уже сохранен в ProjectTypeAgentProjectType
  // Синхронизация произойдет автоматически при следующем запросе GET /agents через syncProjectAgentsForProject
  // Это избегает конфликтов и перезаписи порядка
  res.json({ success: true });
}));

export default router;
