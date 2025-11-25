import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { generateAgentResponse, generateSummaryContent } from '../services/openaiService';
import { withRetry } from '../utils/prismaRetry';
import { logger } from '../utils/logger';

const router = Router();

const agentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  systemInstruction: z.string().optional(),
  summaryInstruction: z.string().optional(),
  model: z.string().optional(),
  role: z.string().optional(),
  projectId: z.string().min(1),
});

const reorderSchema = z.object({
  orders: z.array(z.object({
    id: z.string().min(1),
    order: z.number().int(),
  })).min(1),
});

const getNextOrderValue = async (userId: string) => {
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

// Вспомогательная функция для получения или создания агента из шаблона ProjectTypeAgent
// Возвращает агента или null, если это не ProjectTypeAgent и агент не найден
const getOrCreateAgentFromTemplate = async (
  agentId: string,
  userId: string,
  projectId?: string
): Promise<any | null> => {
  // Сначала пытаемся найти агента в таблице Agent
  let agent = await withRetry(
    () => prisma.agent.findFirst({
      where: { id: agentId, userId },
    }),
    3,
    `getOrCreateAgentFromTemplate - find agent ${agentId}`
  );

  if (agent) {
    return agent;
  }

  // Если агент не найден, проверяем, является ли это ProjectTypeAgent
  try {
    const projectTypeAgent = await withRetry(
      () => (prisma as any).projectTypeAgent.findUnique({
        where: { id: agentId },
      }),
      3,
      `getOrCreateAgentFromTemplate - find project type agent ${agentId}`
    );

    if (!projectTypeAgent) {
      return null; // Не ProjectTypeAgent и не Agent
    }

    // Если это ProjectTypeAgent, но projectId не указан - возвращаем null
    // (не можем создать экземпляр без projectId)
    if (!projectId) {
      return null;
    }

    // Проверяем, что проект принадлежит пользователю
    const project = await withRetry(
      () => prisma.project.findFirst({
        where: { id: projectId, userId },
      }),
      3,
      `getOrCreateAgentFromTemplate - verify project ${projectId}`
    );

    if (!project) {
      return null;
    }

    const template = projectTypeAgent as any;
    if (!template || !template.name) {
      return null;
    }

    // Проверяем, не был ли уже создан агент из этого шаблона для данного проекта
    const existingAgent = await withRetry(
      () => prisma.agent.findFirst({
        where: {
          userId,
          projectId: projectId,
          name: template.name,
        },
      }),
      3,
      `getOrCreateAgentFromTemplate - check existing agent`
    );

    if (existingAgent) {
      return existingAgent;
    }

    // Создаем новый экземпляр агента проекта из шаблона
    const nextOrder = await getNextOrderValue(userId);
    
    agent = await withRetry(
      () => prisma.agent.create({
        data: {
          userId,
          projectId: projectId,
          name: template.name,
          description: template.description ?? '',
          systemInstruction: template.systemInstruction ?? '',
          summaryInstruction: template.summaryInstruction ?? '',
          model: template.model ?? 'gpt-5.1',
          role: template.role ?? '',
          order: nextOrder,
        },
      }),
      3,
      `getOrCreateAgentFromTemplate - create agent from template`
    );

    logger.info({ 
      newAgentId: agent.id,
      templateId: agentId,
      projectId: projectId,
      userId,
      agentName: agent.name 
    }, 'Created new agent instance from ProjectTypeAgent template');

    return agent;
  } catch (error: any) {
    logger.error({ 
      agentId,
      error: error.message,
      code: error.code 
    }, 'Failed to get or create agent from template');
    return null;
  }
};

router.get('/', async (req, res, next) => {
  try {
    const userId = req.userId!;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const projectId = req.query.projectId as string | undefined;
    
    let whereClause: any = { userId };
    
    // Если указан projectId, фильтруем агентов по проекту
    if (projectId) {
      whereClause.projectId = projectId;
    }
    
    // Оптимизация: загружаем агентов проекта и проект параллельно
    // Это ускоряет загрузку рабочего пространства
    const [agents, project] = await Promise.all([
      // Оптимизация: НЕ загружаем файлы при загрузке списка агентов
      // Файлы (база знаний) загружаются отдельно, когда нужно
      withRetry(
        () => prisma.agent.findMany({
          where: whereClause,
          // УБРАЛИ include: { files } - файлы не нужны при загрузке списка
          orderBy: [
            { order: 'asc' },
            { createdAt: 'asc' },
          ],
        }),
        3,
        `GET /agents?projectId=${projectId || 'none'}`
      ),
      // Загружаем проект только если указан projectId
      projectId
        ? withRetry(
            () => prisma.project.findUnique({
              where: { id: projectId },
              select: { projectTypeId: true },
            }),
            3,
            `GET /agents - find project ${projectId}`
          )
        : Promise.resolve(null),
    ]);

    // Загружаем агентов типа проекта, если проект найден
    // Используем связь many-to-many через ProjectTypeAgentProjectType
    // ВАЖНО: возвращаем только агентов, которые связаны с типом проекта через ProjectTypeAgentProjectType
    let projectTypeAgents: any[] = [];
    if (project?.projectTypeId) {
      try {
        // Сначала находим связи через промежуточную таблицу
        // Фильтруем строго по projectTypeId - только агенты, связанные с этим типом проекта
        const connections = await withRetry(
          () => (prisma as any).projectTypeAgentProjectType.findMany({
            where: {
              projectTypeId: project.projectTypeId, // Строгая фильтрация по типу проекта
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
        
        // Преобразуем данные в нужный формат
        // Фильтруем только агентов, которые действительно связаны с типом проекта
        projectTypeAgents = connections
          .filter((conn: any) => {
            // Убеждаемся, что связь существует и projectTypeId совпадает
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
          .map((conn: any) => ({
            ...conn.projectTypeAgent,
            order: conn.order, // Используем order из связи
            projectTypes: [{
              projectType: conn.projectType,
              order: conn.order,
            }],
          }));
        
        logger.debug({ 
          projectTypeId: project.projectTypeId, 
          projectTypeAgentsCount: projectTypeAgents.length,
          agentIds: projectTypeAgents.map((a: any) => a.id)
        }, 'Filtered project type agents');
      } catch (error: any) {
        // Если таблица не существует или миграция не применена, просто возвращаем пустой массив
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

    // Добавляем пустой массив files для каждого агента (для совместимости с фронтендом)
    const agentsWithEmptyFiles = agents.map(agent => ({
      ...agent,
      files: [],
    }));

    logger.debug({ userId, agentsCount: agents.length, projectTypeAgentsCount: projectTypeAgents.length }, 'Agents loaded');

    // Теперь возвращаем только projectTypeAgents, обычные агенты не нужны
    // (экземпляры агентов создаются автоматически из шаблонов при первом использовании)
    res.json({ 
      agents: [], // Обычные агенты больше не используются
      projectTypeAgents: projectTypeAgents.length > 0 ? projectTypeAgents : undefined
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'GET /agents error');
    next(error);
  }
});

router.post('/', async (req, res) => {
  const userId = req.userId!;
  const parsed = agentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const nextOrder = await getNextOrderValue(userId);

  const agent = await withRetry(
    () => prisma.agent.create({
      data: {
        userId,
        projectId: parsed.data.projectId,
        name: parsed.data.name,
        description: parsed.data.description ?? '',
        systemInstruction: parsed.data.systemInstruction ?? '',
        summaryInstruction: parsed.data.summaryInstruction ?? '',
        model: parsed.data.model ?? 'gpt-5.1',
        role: parsed.data.role ?? '',
        order: nextOrder,
      },
    }),
    3,
    'POST /agents - create agent'
  );

  res.status(201).json({ agent });
});

router.post('/reorder', async (req, res) => {
  const userId = req.userId!;
  const parsed = reorderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const orders = parsed.data.orders;
  const agentIds = orders.map((order) => order.id);

  const ownedAgents = await withRetry(
    () => prisma.agent.findMany({
      where: {
        userId,
        id: { in: agentIds },
      },
      select: { id: true },
    }),
    3,
    'POST /agents/reorder - find owned agents'
  );

  if (ownedAgents.length !== agentIds.length) {
    return res.status(403).json({ error: 'One or more agents do not belong to the user' });
  }

  const updates = orders.map(({ id, order }) =>
    prisma.agent.update({
      where: { id },
      data: { order },
    })
  );

  await withRetry(
    () => prisma.$transaction(updates),
    3,
    'POST /agents/reorder - transaction'
  );

  logger.debug({ userId, agentsCount: orders.length }, 'Agents reordered');
  res.json({ success: true });
});

router.put('/:agentId', async (req, res) => {
  const userId = req.userId!;
  const { agentId } = req.params;

  const parsed = agentSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    logger.warn({ agentId, userId, validationError: parsed.error.flatten() }, 'Agent update validation failed');
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const existing = await withRetry(
      () => prisma.agent.findFirst({ where: { id: agentId, userId } }),
      3,
      `PUT /agents/${agentId} - find existing`
    );
    if (!existing) {
      logger.warn({ agentId, userId }, 'Agent not found for update');
      return res.status(404).json({ error: 'Agent not found' });
    }

    const updated = await withRetry(
      () => prisma.agent.update({
        where: { id: agentId },
        data: parsed.data,
      }),
      3,
      `PUT /agents/${agentId} - update`
    );

    logger.debug({ agentId, userId, updatedFields: Object.keys(parsed.data) }, 'Agent updated');

    res.json({ agent: updated });
  } catch (error) {
    logger.error({ 
      agentId, 
      userId, 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined 
    }, 'Failed to update agent');
    return res.status(500).json({ 
      error: 'Failed to update agent',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.delete('/:agentId', async (req, res) => {
  const userId = req.userId!;
  const { agentId } = req.params;

  try {
    // Проверяем, существует ли агент с таким ID у пользователя
    const existing = await withRetry(
      () => prisma.agent.findFirst({ 
        where: { id: agentId, userId },
      }),
      3,
      `DELETE /agents/${agentId} - find existing`
    );

    if (!existing) {
      // Проверяем, может быть агент существует, но принадлежит другому пользователю
      const agentExists = await withRetry(
        () => prisma.agent.findFirst({ where: { id: agentId } }),
        3,
        `DELETE /agents/${agentId} - check if exists`
      );
      if (agentExists) {
        logger.warn({ agentId, agentUserId: agentExists.userId, currentUserId: userId }, 'Attempt to delete agent belonging to different user');
        return res.status(403).json({ error: 'Access denied. Agent belongs to different user.' });
      }
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Запрещаем удаление агентов с ролью
    if (existing.role && existing.role.trim() !== '') {
      logger.warn({ agentId, role: existing.role }, 'Attempt to delete agent with role');
      return res.status(400).json({ error: 'Cannot delete agent with assigned role' });
    }

    // Удаляем агента - каскадное удаление автоматически удалит связанные messages и files
    // благодаря onDelete: Cascade в схеме Prisma и включенным foreign keys в SQLite
    // Foreign keys включены при инициализации Prisma Client в db/prisma.ts
    await withRetry(
      () => prisma.agent.delete({ where: { id: agentId } }),
      3,
      `DELETE /agents/${agentId} - delete`
    );
    logger.debug({ agentId, userId, agentName: existing.name }, 'Agent deleted');
    
    res.status(204).send();
  } catch (error) {
    logger.error({ 
      agentId, 
      userId, 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined 
    }, 'Failed to delete agent');
    
    // Если это ошибка Prisma о внешних ключах, возвращаем понятное сообщение
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return res.status(500).json({ 
        error: 'Failed to delete agent due to database constraints. Please try again.' 
      });
    }
    
    return res.status(500).json({ 
      error: 'Failed to delete agent',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/:agentId/messages', async (req, res) => {
  const userId = req.userId!;
  const { agentId } = req.params;

  // Пытаемся найти агента, но если это ProjectTypeAgent без экземпляра - возвращаем пустой массив
  const agent = await withRetry(
    () => prisma.agent.findFirst({
      where: { id: agentId, userId },
    }),
    3,
    `GET /agents/${agentId}/messages - find agent`
  );

  if (!agent) {
    // Проверяем, является ли это ProjectTypeAgent (шаблон без экземпляра)
    // Если да - возвращаем пустой массив (сообщений еще нет)
    try {
      const projectTypeAgent = await withRetry(
        () => (prisma as any).projectTypeAgent.findUnique({
          where: { id: agentId },
        }),
        3,
        `GET /agents/${agentId}/messages - check if ProjectTypeAgent`
      );

      if (projectTypeAgent) {
        // Это шаблон, который еще не имеет экземпляра - возвращаем пустой массив
        return res.json({ messages: [] });
      }
    } catch (error) {
      // Игнорируем ошибки при проверке ProjectTypeAgent
    }

    return res.status(404).json({ error: 'Agent not found' });
  }

  const messages = await withRetry(
    () => prisma.message.findMany({
      where: { agentId: agent.id }, // Используем ID созданного агента
      orderBy: { createdAt: 'asc' },
    }),
    3,
    `GET /agents/${agentId}/messages - find messages`
  );

  res.json({ messages });
});

const messageSchema = z.object({
  text: z.string().min(1),
  projectId: z.string().optional(), // ID активного проекта
});

router.post('/:agentId/messages', async (req, res) => {
  const userId = req.userId!;
  const { agentId } = req.params;
  
  logger.info({ 
    agentId, 
    userId,
    body: req.body,
    hasProjectId: !!req.body?.projectId 
  }, 'POST /agents/:agentId/messages - request received');
  
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) {
    logger.warn({ agentId, userId, validationError: parsed.error.flatten() }, 'Message validation failed');
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  // Загружаем документы проекта (НЕ база знаний агентов)
  // projectId обязателен для изоляции проектов
  if (!parsed.data.projectId) {
    logger.warn({ agentId, userId }, 'projectId is missing in request body');
    return res.status(400).json({ 
      error: 'projectId is required. Project isolation requires explicit project context.' 
    });
  }

  // Используем функцию для получения или создания агента из шаблона
  const agent = await getOrCreateAgentFromTemplate(
    agentId,
    userId,
    parsed.data.projectId
  );

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  // Загружаем агентов проекта и историю (теперь agent точно существует)
  // После создания нового агента нужно перезагрузить список projectAgents
  const projectId = parsed.data.projectId!;
  const [projectAgents, history] = await Promise.all([
    withRetry(
      () => prisma.agent.findMany({
        where: { projectId: projectId },
        select: { id: true },
      }),
      3,
      `POST /agents/${agentId}/messages - find project agents`
    ),
    withRetry(
      () => prisma.message.findMany({
        where: { agentId: agent.id },
        orderBy: { createdAt: 'asc' },
        take: 50,
      }),
      3,
      `POST /agents/${agentId}/messages - find history`
    ),
  ]);

  const agentIds = projectAgents.map(a => a.id);

  // Загружаем файлы проекта
  const allProjectFiles = await withRetry(
    () => prisma.file.findMany({
      where: {
        isKnowledgeBase: false,  // Исключаем базу знаний
        agentId: { in: agentIds },  // Файлы агентов проекта
      },
      select: {
        id: true,
        name: true,
        mimeType: true,
        content: true,
        agentId: true,
        isKnowledgeBase: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    3,
    `POST /agents/${agentId}/messages - find project files`
  );

  logger.debug({ 
    agentId: agent.id, 
    agentName: agent.name,
    projectFilesCount: allProjectFiles.length 
  }, 'Processing message with project files');

  // Создаем объект агента со всеми файлами проекта
  const agentWithAllFiles = {
    ...agent,
    files: allProjectFiles,
  };

  const userMessage = await withRetry(
    () => prisma.message.create({
      data: {
        agentId: agent.id, // Используем ID созданного/найденного агента, а не ID шаблона
        userId,
        role: 'USER',
        text: parsed.data.text,
      },
    }),
    3,
    `POST /agents/${agentId}/messages - create user message`
  );

  const conversationHistory: { role: 'USER' | 'MODEL'; text: string }[] = history.map((message) => ({
    role: message.role === 'USER' ? 'USER' : 'MODEL',
    text: message.text,
  }));

  try {
    const responseText = await generateAgentResponse(
      agentWithAllFiles,
      conversationHistory,
      parsed.data.text,
    );

    const modelMessage = await withRetry(
      () => prisma.message.create({
        data: {
          agentId: agent.id, // Используем ID созданного/найденного агента, а не ID шаблона
          role: 'MODEL',
          text: responseText,
        },
      }),
      3,
      `POST /agents/${agentId}/messages - create model message`
    );

    // Если агент был создан из шаблона, возвращаем также новый agentId
    // чтобы фронтенд мог обновить состояние
    const response: any = { messages: [userMessage, modelMessage] };
    if (agent.id !== agentId) {
      response.agentId = agent.id; // Новый ID созданного агента
      response.templateId = agentId; // ID шаблона для справки
    }

    return res.json(response);
  } catch (error) {
    logger.error({ 
      agentId, 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined 
    }, 'OpenAI API error');
    const errorMessage = error instanceof Error ? error.message : 'Failed to get response from OpenAI';
    // Проверяем на специфические ошибки
    let userFriendlyMessage = 'Ошибка генерации. Попробуйте позже.';
    if (errorMessage.includes('API key')) {
      userFriendlyMessage = 'Неверный API ключ OpenAI. Проверьте настройки сервера.';
    } else if (errorMessage.includes('rate limit')) {
      userFriendlyMessage = 'Превышен лимит запросов к OpenAI. Попробуйте позже.';
    } else if (errorMessage.includes('model')) {
      userFriendlyMessage = 'Ошибка модели OpenAI. Проверьте настройки агента.';
    }
    return res.status(500).json({ error: userFriendlyMessage, details: errorMessage });
  }
});

router.delete('/:agentId/messages', async (req, res) => {
  const userId = req.userId!;
  const { agentId } = req.params;

  const agent = await withRetry(
    () => prisma.agent.findFirst({
      where: { id: agentId, userId },
    }),
    3,
    `DELETE /agents/${agentId}/messages - find agent`
  );

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  await withRetry(
    () => prisma.message.deleteMany({
      where: { agentId },
    }),
    3,
    `DELETE /agents/${agentId}/messages - delete messages`
  );

  res.status(204).send();
});

const fileSchema = z.object({
  name: z.string().min(1),
  mimeType: z.string().min(1),
  content: z.string().min(1),
  isKnowledgeBase: z.boolean().optional().default(false),
});

router.post('/:agentId/files', async (req, res) => {
  const userId = req.userId!;
  const { agentId } = req.params;
  const parsed = fileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const agent = await withRetry(
    () => prisma.agent.findFirst({ where: { id: agentId, userId } }),
    3,
    `POST /agents/${agentId}/files - find agent`
  );
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  const file = await withRetry(
    () => prisma.file.create({
      data: {
        agentId,
        name: parsed.data.name,
        mimeType: parsed.data.mimeType,
        content: parsed.data.content,
        isKnowledgeBase: parsed.data.isKnowledgeBase ?? false,
      },
    }),
    3,
    `POST /agents/${agentId}/files - create file`
  );

  logger.debug({ 
    fileId: file.id, 
    fileName: file.name, 
    agentId: file.agentId, 
    isKnowledgeBase: file.isKnowledgeBase 
  }, 'File created');

  res.status(201).json({ file });
});

// GET /:agentId/files - получить файлы агента (база знаний)
router.get('/:agentId/files', async (req, res, next) => {
  const { agentId } = req.params;
  try {
    const userId = req.userId!;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const agent = await withRetry(
      () => prisma.agent.findFirst({
        where: { id: agentId, userId },
      }),
      3,
      `GET /agents/${agentId}/files - find agent`
    );

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Загружаем только файлы базы знаний (не документы проекта)
    const files = await withRetry(
      () => prisma.file.findMany({
        where: {
          agentId,
          isKnowledgeBase: true,  // Только база знаний
          name: {
            not: {
              startsWith: 'Summary'
            }
          }
        },
        select: {
          id: true,
          name: true,
          mimeType: true,
          content: true,
          agentId: true,
          isKnowledgeBase: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      3,
      `GET /agents/${agentId}/files - find files`
    );

    res.json({ files });
  } catch (error: any) {
    logger.error({ agentId, error: error.message, stack: error.stack }, 'GET /agents/:agentId/files error');
    next(error);
  }
});

router.get('/:agentId/files/summary', async (req, res, next) => {
  const { agentId } = req.params;
  const projectId = req.query.projectId as string | undefined;
  try {
    const userId = req.userId!;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!projectId) {
      return res.status(400).json({ 
        error: 'projectId query parameter is required. Project isolation requires explicit project context.' 
      });
    }

    // Используем функцию для получения или создания агента из шаблона
    const agent = await getOrCreateAgentFromTemplate(agentId, userId, projectId);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Получаем всех агентов проекта для загрузки их файлов
    const projectAgents = await withRetry(
      () => prisma.agent.findMany({
        where: { projectId: projectId },
        select: { id: true },
      }),
      3,
      `GET /agents/${agentId}/files/summary - find project agents`
    );
    
    // Если новый агент был создан, убеждаемся что он в списке
    let agentIds = projectAgents.map(a => a.id);
    if (!agentIds.includes(agent.id)) {
      agentIds = [...agentIds, agent.id];
    }

    const projectFiles = await withRetry(
      () => prisma.file.findMany({
        where: {
          isKnowledgeBase: false,  // Исключаем базу знаний
          agentId: { in: agentIds },  // Файлы агентов проекта
        },
        select: {
          id: true,
          name: true,
          mimeType: true,
          content: true,
          agentId: true,
          isKnowledgeBase: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      3,
      `GET /agents/${agentId}/files/summary - find project files`
    );

    logger.debug({ agentId, projectId, filesCount: projectFiles.length }, 'Summary files loaded');

    res.json({ files: projectFiles });
  } catch (error: any) {
    logger.error({ agentId, projectId, error: error.message, stack: error.stack }, 'GET /agents/:agentId/files/summary error');
    next(error);
  }
});

// ВАЖНО: Этот маршрут должен быть ВЫШЕ /:agentId/files/:fileId
// чтобы Express не интерпретировал '/files' как ':agentId'
router.delete('/files/:fileId', async (req, res) => {
  const userId = req.userId!;
  const { fileId } = req.params;

  const file = await withRetry(
    () => prisma.file.findFirst({
      where: { id: fileId },
      include: { agent: true },
    }),
    3,
    `DELETE /agents/files/${fileId} - find file`
  );

  if (!file) {
    logger.warn({ fileId, userId }, 'File not found for deletion');
    return res.status(404).json({ error: 'File not found' });
  }

  if (file.agent.userId !== userId) {
    logger.warn({ fileId, fileUserId: file.agent.userId, currentUserId: userId }, 'Attempt to delete file belonging to different user');
    return res.status(403).json({ error: 'Access denied. File belongs to different user.' });
  }

  await withRetry(
    () => prisma.file.delete({ where: { id: fileId } }),
    3,
    `DELETE /agents/files/${fileId} - delete file`
  );
  logger.debug({ fileId, userId, fileName: file.name }, 'File deleted');

  res.status(204).send();
});

router.delete('/:agentId/files/:fileId', async (req, res) => {
  const userId = req.userId!;
  const { agentId, fileId } = req.params;

  // Проверяем, что агент существует и принадлежит пользователю (для валидации запроса)
  const agent = await withRetry(
    () => prisma.agent.findFirst({
      where: { id: agentId, userId },
    }),
    3,
    `DELETE /agents/${agentId}/files/${fileId} - find agent`
  );

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  // Находим файл с информацией о его агенте
  const file = await withRetry(
    () => prisma.file.findFirst({
      where: { id: fileId },
      include: { agent: true },
    }),
    3,
    `DELETE /agents/${agentId}/files/${fileId} - find file`
  );

  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Проверяем, что файл принадлежит любому агенту этого пользователя
  // Если userId агента файла совпадает с userId запрашивающего агента - можно удалять
  if (file.agent.userId !== userId) {
    return res.status(403).json({ error: 'Access denied. File belongs to different user.' });
  }

  // Удаляем файл - теперь все проверки пройдены
  await withRetry(
    () => prisma.file.delete({ where: { id: fileId } }),
    3,
    `DELETE /agents/${agentId}/files/${fileId} - delete file`
  );
  
  res.status(204).send();
});

router.post('/:agentId/summary', async (req, res) => {
  const userId = req.userId!;
  const { agentId } = req.params;

  const agent = await withRetry(
    () => prisma.agent.findFirst({
      where: { id: agentId, userId },
      include: { files: true },
    }),
    3,
    `POST /agents/${agentId}/summary - find agent`
  );

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  const messages = await withRetry(
    () => prisma.message.findMany({
      where: { agentId },
      orderBy: { createdAt: 'asc' },
    }),
    3,
    `POST /agents/${agentId}/summary - find messages`
  );

  if (messages.length === 0) {
    return res.status(400).json({ error: 'Not enough messages for summary' });
  }

  const transcript = messages
    .map(
      (message) => `${message.role === 'USER' ? 'USER' : 'MODEL'}: ${message.text}`,
    )
    .join('\n\n');

  try {
    logger.debug({ agentId, userId, messagesCount: messages.length }, 'Generating summary');

    const summaryText = await generateSummaryContent(agent, transcript);
    const fileName = `Summary - ${agent.name} - ${new Date().toLocaleString()}`;

    const file = await withRetry(
      () => prisma.file.create({
        data: {
          agentId,
          name: fileName,
          mimeType: 'text/markdown',
          content: Buffer.from(summaryText, 'utf-8').toString('base64'),
          isKnowledgeBase: false,  // Summary файлы - это документы проекта, не база знаний
        },
      }),
      3,
      `POST /agents/${agentId}/summary - create file`
    );

    logger.info({ 
      fileId: file.id, 
      fileName: file.name, 
      agentId: file.agentId,
      summaryLength: summaryText.length 
    }, 'Summary file created');

    res.status(201).json({ file });
  } catch (error) {
    logger.error({ 
      agentId, 
      userId, 
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined 
    }, 'Summary generation failed');
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

export default router;

