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

  // Загружаем агентов типа проекта и их порядок
  const templateConnections = await withRetry(
    () => (prisma as any).projectTypeAgentProjectType.findMany({
      where: { projectTypeId },
      include: {
        projectTypeAgent: true,
      },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'asc' },
      ],
    }),
    3,
    'POST /projects - load project type agents'
  ) as any[];

  const templateAgentIds = templateConnections
    .map((connection) => connection?.projectTypeAgent?.id)
    .filter((id: string | undefined): id is string => Boolean(id));

  // Подготовим базы знаний шаблонов для копирования
  let templateKnowledgeBaseMap = new Map<string, any[]>();
  if (templateAgentIds.length > 0) {
    const templateFiles = await withRetry(
      () => prisma.file.findMany({
        where: {
          projectTypeAgentId: { in: templateAgentIds },
          isKnowledgeBase: true,
          name: {
            not: {
              startsWith: 'Summary',
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      3,
      'POST /projects - load template knowledge base'
    );

    templateKnowledgeBaseMap = templateFiles.reduce((map, file) => {
      if (!file.projectTypeAgentId) {
        return map;
      }
      if (!map.has(file.projectTypeAgentId)) {
        map.set(file.projectTypeAgentId, []);
      }
      map.get(file.projectTypeAgentId)!.push(file);
      return map;
    }, new Map<string, any[]>());
  }

  const createdProject = await withRetry(
    () => prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          name,
          description: description || null,
          userId,
          projectTypeId,
        },
      });

      // Создаем агентов проекта на основе шаблонов администратора
      for (const [index, connection] of templateConnections.entries()) {
        const template = connection?.projectTypeAgent;
        if (!template) {
          continue;
        }

        const agent = await tx.agent.create({
          data: {
            userId,
            projectId: project.id,
            projectTypeAgentId: template.id,
            name: template.name,
            description: template.description ?? '',
            systemInstruction: template.systemInstruction ?? '',
            summaryInstruction: template.summaryInstruction ?? '',
            model: template.model ?? 'gpt-5.1',
            role: template.role ?? '',
            order: typeof connection.order === 'number' ? connection.order : index,
          },
        });

        const knowledgeBaseFiles = templateKnowledgeBaseMap.get(template.id) ?? [];
        if (knowledgeBaseFiles.length > 0) {
          await tx.file.createMany({
            data: knowledgeBaseFiles.map((file) => ({
              agentId: agent.id,
              name: file.name,
              mimeType: file.mimeType,
              content: file.content,
              isKnowledgeBase: true,
            })),
          });
        }
      }

      return project;
    }),
    3,
    'POST /projects - create project with agents'
  );

  const project = await withRetry(
    () => prisma.project.findUnique({
      where: { id: createdProject.id },
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
    'POST /projects - load created project'
  );

  if (!project) {
    logger.error({ createdProjectId: createdProject.id }, 'Failed to load project after creation');
    return res.status(500).json({ error: 'Не удалось создать проект' });
  }

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

// GET /:projectId/files - получить все файлы проекта
router.get('/:projectId/files', asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.userId!;
  const { projectId } = req.params;

  // Проверяем, что проект принадлежит пользователю
  const project = await withRetry(
    () => prisma.project.findFirst({
      where: { id: projectId, userId },
      select: { id: true },
    }),
    3,
    `GET /projects/${projectId}/files - find project`
  );

  if (!project) {
    return res.status(404).json({ error: 'Проект не найден' });
  }

  // Получаем всех агентов проекта
  const agents = await withRetry(
    () => prisma.agent.findMany({
      where: { projectId, userId },
      select: { id: true },
    }),
    3,
    `GET /projects/${projectId}/files - find agents`
  );

  const agentIds = agents.map(agent => agent.id);

  // Получаем все файлы проекта (не из базы знаний)
  const files = await withRetry(
    () => prisma.file.findMany({
      where: {
        agentId: { in: agentIds },
        isKnowledgeBase: false,
      },
      orderBy: { createdAt: 'desc' },
    }),
    3,
    `GET /projects/${projectId}/files - find files`
  );

  logger.debug({ userId, projectId, filesCount: files.length }, 'Project files fetched');
  res.json({ files });
}));

// POST /:projectId/files - загрузить файл в проект
router.post('/:projectId/files', asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.userId!;
  const { projectId } = req.params;
  const { name, mimeType, content } = req.body;

  // Валидация входных данных
  if (!name || !mimeType || !content) {
    return res.status(400).json({ error: 'Необходимо указать name, mimeType и content' });
  }

  // Проверяем, что проект принадлежит пользователю
  const project = await withRetry(
    () => prisma.project.findFirst({
      where: { id: projectId, userId },
      select: { id: true },
    }),
    3,
    `POST /projects/${projectId}/files - find project`
  );

  if (!project) {
    return res.status(404).json({ error: 'Проект не найден' });
  }

  // Находим первого агента проекта для связи с файлом
  const agent = await withRetry(
    () => prisma.agent.findFirst({
      where: { projectId, userId },
      select: { id: true },
      orderBy: { order: 'asc' },
    }),
    3,
    `POST /projects/${projectId}/files - find first agent`
  );

  if (!agent) {
    return res.status(400).json({ error: 'В проекте нет агентов. Создайте хотя бы одного агента.' });
  }

  // Создаем файл
  const file = await withRetry(
    () => prisma.file.create({
      data: {
        agentId: agent.id,
        name,
        mimeType,
        content,
        isKnowledgeBase: false,
      },
    }),
    3,
    `POST /projects/${projectId}/files - create file`
  );

  logger.info({ userId, projectId, fileId: file.id, fileName: file.name }, 'Project file uploaded');
  res.status(201).json({ file });
}));

// DELETE /:projectId/files/:fileId - удалить файл проекта
router.delete('/:projectId/files/:fileId', asyncHandler(async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.userId!;
  const { projectId, fileId } = req.params;

  // Проверяем, что проект принадлежит пользователю
  const project = await withRetry(
    () => prisma.project.findFirst({
      where: { id: projectId, userId },
      select: {
        id: true,
        projectTypeId: true,
      },
    }),
    3,
    `DELETE /projects/${projectId}/files/${fileId} - find project`
  );

  if (!project) {
    return res.status(404).json({ error: 'Проект не найден' });
  }

  // Находим файл с информацией о его агенте/шаблоне
  const file = await withRetry(
    () => prisma.file.findFirst({
      where: { id: fileId },
      select: {
        id: true,
        name: true,
        projectTypeAgentId: true,
        agent: {
          select: {
            id: true,
            projectId: true,
            userId: true,
          },
        },
      },
    }),
    3,
    `DELETE /projects/${projectId}/files/${fileId} - find file`
  );

  if (!file) {
    return res.status(404).json({ error: 'Файл не найден' });
  }

  let belongsToProject = false;

  if (file.agent) {
    if (file.agent.projectId !== projectId) {
      logger.warn({ fileId, fileProjectId: file.agent.projectId, currentProjectId: projectId }, 'File belongs to different project');
      return res.status(403).json({ error: 'Доступ запрещен. Файл не принадлежит этому проекту.' });
    }

    if (file.agent.userId !== userId) {
      logger.warn({ fileId, fileUserId: file.agent.userId, currentUserId: userId }, 'Attempt to delete file belonging to different user');
      return res.status(403).json({ error: 'Доступ запрещен. Файл принадлежит другому пользователю.' });
    }

    belongsToProject = true;
  } else if (file.projectTypeAgentId) {
    if (!project.projectTypeId) {
      logger.warn({ fileId, projectId, userId }, 'Project has no projectTypeId while deleting template-based file');
      return res.status(403).json({ error: 'Доступ запрещен. Файл не принадлежит этому проекту.' });
    }
    const templateAgentId = file.projectTypeAgentId;

    const templateConnection = await withRetry(
      () => prisma.projectTypeAgentProjectType.findFirst({
        where: {
          projectTypeAgentId: templateAgentId,
          projectTypeId: project.projectTypeId,
        },
        select: { id: true },
      }),
      3,
      `DELETE /projects/${projectId}/files/${fileId} - validate template file access`
    );

    if (!templateConnection) {
      logger.warn({
        fileId,
        projectId,
        projectTypeId: project.projectTypeId,
        projectTypeAgentId: templateAgentId,
      }, 'Template file does not belong to project type');
      return res.status(403).json({ error: 'Доступ запрещен. Файл не принадлежит этому проекту.' });
    }

    belongsToProject = true;
  }

  if (!belongsToProject) {
    logger.warn({ fileId, projectId, userId }, 'File has no agent or template reference, cannot delete');
    return res.status(403).json({ error: 'Доступ запрещен. Файл не принадлежит этому проекту.' });
  }

  await withRetry(
    () => prisma.file.delete({ where: { id: fileId } }),
    3,
    `DELETE /projects/${projectId}/files/${fileId} - delete file`
  );

  logger.info({ userId, projectId, fileId, fileName: file.name }, 'Project file deleted');
  res.status(204).send();
}));

export default router;

