import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { generateAgentResponse, generateSummaryContent, generateDocumentResult, decodeBase64ToText } from '../services/openaiService';
import { withRetry } from '../utils/prismaRetry';
import { logger } from '../utils/logger';
import { syncProjectAgentsForProject } from '../services/projectTypeSync';

const router = Router();

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

const cloneTemplateKnowledgeBase = async (templateId: string, agentId: string) => {
  const files = await withRetry(
    () => prisma.file.findMany({
      where: {
        projectTypeAgentId: templateId,
        isKnowledgeBase: true,
        name: {
          not: {
            startsWith: 'Summary',
          },
        },
      } as Prisma.FileWhereInput & { projectTypeAgentId?: string | null },
      orderBy: { createdAt: 'asc' },
    }),
    3,
    `cloneTemplateKnowledgeBase - load files for ${templateId}`
  );

  if (files.length === 0) {
    return;
  }

  await withRetry(
    () => prisma.file.createMany({
      data: files.map((file) => ({
        agentId,
        name: file.name,
        mimeType: file.mimeType,
        content: file.content,
        isKnowledgeBase: true,
      })),
    }),
    3,
    `cloneTemplateKnowledgeBase - copy files for ${agentId}`
  );
};

const forbidAgentMutation = (res: Response) => {
  return res.status(403).json({ error: 'Управление агентами доступно только администратору' });
};

// Вспомогательная функция для получения или создания агента из шаблона ProjectTypeAgent
// Возвращает агента или null, если это не ProjectTypeAgent и агент не найден
const getOrCreateAgentFromTemplate = async (
  agentId: string,
  userId: string,
  projectId?: string
): Promise<any | null> => {
  logger.debug({ agentId, userId, projectId }, 'getOrCreateAgentFromTemplate - starting');

  // Сначала пытаемся найти агента в таблице Agent
  let agent = await withRetry(
    () => prisma.agent.findFirst({
      where: { id: agentId, userId },
    }),
    3,
    `getOrCreateAgentFromTemplate - find agent ${agentId}`
  );

  if (agent) {
    logger.debug({ agentId: agent.id, agentName: agent.name }, 'getOrCreateAgentFromTemplate - found existing agent');
    return agent;
  }

  logger.debug({ agentId }, 'getOrCreateAgentFromTemplate - agent not found, checking ProjectTypeAgent');

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
      logger.debug({ agentId }, 'getOrCreateAgentFromTemplate - not a ProjectTypeAgent either');
      return null; // Не ProjectTypeAgent и не Agent
    }

    const template = projectTypeAgent as any;
    logger.debug({ agentId, templateName: template?.name }, 'getOrCreateAgentFromTemplate - found ProjectTypeAgent template');

    // Если это ProjectTypeAgent, но projectId не указан - возвращаем null
    // (не можем создать экземпляр без projectId)
    if (!projectId) {
      logger.debug({ agentId, templateName: template?.name }, 'getOrCreateAgentFromTemplate - projectId not provided, cannot create instance');
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
      logger.warn({ agentId, projectId, userId }, 'getOrCreateAgentFromTemplate - project not found or does not belong to user');
      return null;
    }

    logger.debug({ agentId, projectId, templateName: template?.name }, 'getOrCreateAgentFromTemplate - project verified, checking for existing agent instance');

    if (!template || !template.name) {
      logger.warn({ agentId, template }, 'getOrCreateAgentFromTemplate - invalid template data (missing name)');
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
      logger.debug({
        agentId: existingAgent.id,
        templateId: agentId,
        templateName: template.name,
        projectId
      }, 'getOrCreateAgentFromTemplate - found existing agent instance from template');
      return existingAgent;
    }

    logger.debug({ agentId, templateName: template.name, projectId }, 'getOrCreateAgentFromTemplate - no existing instance found, creating new one');

    // Создаем новый экземпляр агента проекта из шаблона
    const nextOrder = await getNextOrderValue(userId);

    const agentData: Prisma.AgentUncheckedCreateInput & { projectTypeAgentId?: string | null } = {
      userId,
      projectId: projectId,
      projectTypeAgentId: template.id,
      name: template.name,
      description: template.description ?? '',
      systemInstruction: template.systemInstruction ?? '',
      summaryInstruction: template.summaryInstruction ?? '',
      model: template.model ?? 'gpt-5.1',
      role: template.role ?? '',
      order: nextOrder,
    };

    agent = await withRetry(
      () => prisma.agent.create({
        data: agentData,
      }),
      3,
      `getOrCreateAgentFromTemplate - create agent from template`
    );
    await cloneTemplateKnowledgeBase(template.id, agent.id);

    logger.info({
      newAgentId: agent.id,
      templateId: agentId,
      projectId: projectId,
      userId,
      agentName: agent.name
    }, 'getOrCreateAgentFromTemplate - created new agent instance from ProjectTypeAgent template');

    return agent;
  } catch (error: any) {
    logger.error({
      agentId,
      userId,
      projectId,
      error: error.message,
      code: error.code,
      stack: error.stack
    }, 'getOrCreateAgentFromTemplate - failed to get or create agent from template');
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
        } as any, // Cast to any to avoid TS error if types are outdated
        orderBy: [
          { order: 'asc' },
          { createdAt: 'asc' },
        ],
      }),
      3,
      `GET /agents?projectId=${projectId}`
    );

    // ... (logic for projectTypeAgents remains the same)

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
          .map((conn: any, index: number) => ({
            ...conn.projectTypeAgent,
            order: conn.order ?? index, // Используем order из связи, index как fallback
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
    // И наследуем isHiddenFromSidebar от шаблона, если он есть
    const agentsWithEmptyFiles = agents.map(agent => {
      const isHidden = (agent as any).isHiddenFromSidebar || ((agent as any).projectTypeAgent?.isHiddenFromSidebar ?? false);
      return {
        ...agent,
        files: [],
        isHiddenFromSidebar: isHidden,
      };
    });

    logger.debug({ userId, agentsCount: agents.length, projectTypeAgentsCount: projectTypeAgents.length }, 'Agents loaded');

    // Возвращаем как шаблоны, так и реальные агенты пользователя
    res.json({
      agents: agentsWithEmptyFiles,
      projectTypeAgents: projectTypeAgents.length > 0 ? projectTypeAgents : undefined
    });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'GET /agents error');
    next(error);
  }
});

router.post('/', async (_req, res) => {
  return forbidAgentMutation(res);
});

router.post('/reorder', async (_req, res) => {
  return forbidAgentMutation(res);
});

router.put('/:agentId', async (_req, res) => {
  return forbidAgentMutation(res);
});

router.delete('/:agentId', async (_req, res) => {
  return forbidAgentMutation(res);
});

router.get('/:agentId/messages', async (req, res) => {
  const userId = req.userId!;
  const { agentId } = req.params;
  const projectId = req.query.projectId as string | undefined;

  logger.info({
    agentId,
    userId,
    projectId,
    hasProjectId: !!projectId
  }, 'GET /agents/:agentId/messages - request received');

  // Используем функцию для получения или создания агента из шаблона
  // Если projectId не указан, функция вернет null для ProjectTypeAgent
  let agent = null;

  if (projectId) {
    // Если projectId указан, пытаемся получить или создать агента из шаблона
    agent = await getOrCreateAgentFromTemplate(agentId, userId, projectId);
  } else {
    // Если projectId не указан, сначала пытаемся найти существующего агента
    agent = await withRetry(
      () => prisma.agent.findFirst({
        where: { id: agentId, userId },
      }),
      3,
      `GET /agents/${agentId}/messages - find agent`
    );

    // Если агент не найден, проверяем, является ли это ProjectTypeAgent
    // В этом случае возвращаем пустой массив (сообщений еще нет, т.к. нет экземпляра)
    if (!agent) {
      try {
        const projectTypeAgent = await withRetry(
          () => (prisma as any).projectTypeAgent.findUnique({
            where: { id: agentId },
          }),
          3,
          `GET /agents/${agentId}/messages - check if ProjectTypeAgent`
        );

        if (projectTypeAgent) {
          logger.debug({ agentId, userId }, 'ProjectTypeAgent template found, returning empty messages array (no projectId provided)');
          return res.json({ messages: [] });
        }
      } catch (error: any) {
        logger.error({ agentId, userId, error: error.message, code: error.code }, 'Error checking ProjectTypeAgent');
      }
    }
  }

  if (!agent) {
    logger.warn({ agentId, userId, projectId }, 'Agent not found and not a ProjectTypeAgent');
    return res.status(404).json({ error: 'Agent not found' });
  }

  // Дополнительная проверка безопасности: убеждаемся, что агент принадлежит пользователю
  if (agent.userId !== userId) {
    logger.warn({ agentId: agent.id, agentUserId: agent.userId, currentUserId: userId }, 'Attempt to access messages of agent belonging to different user');
    return res.status(403).json({ error: 'Access denied. Agent belongs to different user.' });
  }

  // Загружаем сообщения для найденного или созданного агента
  // Фильтруем строго по agentId - каждый агент видит только свои сообщения
  const messages = await withRetry(
    () => prisma.message.findMany({
      where: { agentId: agent.id },
      orderBy: { createdAt: 'asc' },
    }),
    3,
    `GET /agents/${agentId}/messages - find messages`
  );

  logger.debug({ agentId: agent.id, messagesCount: messages.length }, 'Messages loaded successfully');

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

  // Проверяем, что проект принадлежит пользователю (дополнительная проверка безопасности)
  const project = await withRetry(
    () => prisma.project.findFirst({
      where: { id: parsed.data.projectId, userId },
    }),
    3,
    `POST /agents/${agentId}/messages - verify project ${parsed.data.projectId}`
  );

  if (!project) {
    logger.warn({ agentId, userId, projectId: parsed.data.projectId }, 'Project not found or does not belong to user');
    return res.status(404).json({ error: 'Project not found' });
  }

  // Загружаем агентов проекта и историю (теперь agent точно существует)
  // После создания нового агента нужно перезагрузить список projectAgents
  const projectId = parsed.data.projectId!;
  const [projectAgents, history] = await Promise.all([
    withRetry(
      () => prisma.agent.findMany({
        where: { projectId: projectId, userId }, // Добавляем проверку userId для дополнительной безопасности
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

  // Загружаем базу знаний агента (isKnowledgeBase: true)
  const agentKnowledgeBase = await withRetry(
    () => prisma.file.findMany({
      where: {
        agentId: agent.id,
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
    `POST /agents/${agentId}/messages - find agent knowledge base`
  );

  // Если агент был создан из шаблона ProjectTypeAgent, загружаем базу знаний шаблона
  let templateKnowledgeBase: any[] = [];
  if (agent.id !== agentId) {
    // Агент был создан из шаблона, загружаем базу знаний шаблона по projectTypeAgentId
    try {
      templateKnowledgeBase = await withRetry(
        () => prisma.file.findMany({
          where: {
            projectTypeAgentId: agentId,
            isKnowledgeBase: true,
            name: {
              not: {
                startsWith: 'Summary'
              }
            }
          },
          select: {
            id: true,
            agentId: true,
            projectTypeAgentId: true,
            name: true,
            mimeType: true,
            content: true,
            isKnowledgeBase: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        } as any),
        3,
        `POST /agents/${agentId}/messages - load template knowledge base`
      );

      logger.debug({
        templateId: agentId,
        templateKnowledgeBaseCount: templateKnowledgeBase.length
      }, 'Loaded template knowledge base');
    } catch (error: any) {
      logger.warn({
        templateId: agentId,
        error: error.message
      }, 'Failed to load template knowledge base');
    }
  }

  // Загружаем документы проекта (isKnowledgeBase: false)
  const allProjectFiles = await withRetry(
    () => prisma.file.findMany({
      where: {
        isKnowledgeBase: false,  // Только документы проекта
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

  // Объединяем все файлы: база знаний агента + база знаний шаблона + документы проекта
  const allFiles = [
    ...agentKnowledgeBase,
    ...templateKnowledgeBase,
    ...allProjectFiles,
  ];

  logger.debug({
    agentId: agent.id,
    agentName: agent.name,
    agentKnowledgeBaseCount: agentKnowledgeBase.length,
    templateKnowledgeBaseCount: templateKnowledgeBase.length,
    projectFilesCount: allProjectFiles.length,
    totalFilesCount: allFiles.length
  }, 'Processing message with all files (knowledge base + project documents)');

  // Создаем объект агента со всеми файлами: база знаний + документы проекта
  const agentWithAllFiles = {
    ...agent,
    files: allFiles,
  };

  logger.info({
    agentId: agent.id,
    agentName: agent.name,
    agentModel: agent.model,
    agentModelType: typeof agent.model,
    projectId: parsed.data.projectId,
  }, 'Preparing to generate agent response');

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
    const errorMessage = error instanceof Error ? error.message : 'Failed to get response from OpenAI';
    logger.error({
      agentId,
      agentName: agent.name,
      agentModel: agent.model,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    }, 'OpenAI API error');

    // Проверяем на специфические ошибки
    let userFriendlyMessage = 'Ошибка генерации. Попробуйте позже.';
    if (errorMessage.includes('API key') || errorMessage.includes('Invalid API key')) {
      userFriendlyMessage = 'Неверный API ключ OpenAI. Проверьте настройки сервера.';
    } else if (errorMessage.includes('rate limit') || errorMessage.includes('Rate limit')) {
      userFriendlyMessage = 'Превышен лимит запросов к OpenAI. Попробуйте позже.';
    } else if (errorMessage.includes('model') || errorMessage.includes('Model') || errorMessage.includes('not found')) {
      userFriendlyMessage = `Ошибка модели OpenAI. Модель "${agent.model || 'не указана'}" недоступна. Проверьте настройки агента.`;
    }
    return res.status(500).json({ error: userFriendlyMessage, details: errorMessage });
  }
});

router.delete('/:agentId/messages', async (req, res) => {
  const userId = req.userId!;
  const { agentId } = req.params;
  const projectId = req.query.projectId as string | undefined;

  logger.info({
    agentId,
    userId,
    projectId,
    hasProjectId: !!projectId
  }, 'DELETE /agents/:agentId/messages - request received');

  // Используем функцию для получения или создания агента из шаблона
  // Если projectId не указан, функция вернет null для ProjectTypeAgent
  let agent = null;

  if (projectId) {
    // Если projectId указан, пытаемся получить или создать агента из шаблона
    agent = await getOrCreateAgentFromTemplate(agentId, userId, projectId);
  } else {
    // Если projectId не указан, сначала пытаемся найти существующего агента
    agent = await withRetry(
      () => prisma.agent.findFirst({
        where: { id: agentId, userId },
      }),
      3,
      `DELETE /agents/${agentId}/messages - find agent`
    );

    // Если агент не найден, проверяем, является ли это ProjectTypeAgent
    // В этом случае возвращаем успешный ответ (у шаблона нет сообщений для удаления)
    if (!agent) {
      try {
        const projectTypeAgent = await withRetry(
          () => (prisma as any).projectTypeAgent.findUnique({
            where: { id: agentId },
          }),
          3,
          `DELETE /agents/${agentId}/messages - check if ProjectTypeAgent`
        );

        if (projectTypeAgent) {
          logger.debug({ agentId, userId }, 'ProjectTypeAgent template found, no messages to delete');
          return res.status(204).send();
        }
      } catch (error: any) {
        logger.error({ agentId, userId, error: error.message, code: error.code }, 'Error checking ProjectTypeAgent');
      }
    }
  }

  if (!agent) {
    logger.warn({ agentId, userId, projectId }, 'Agent not found and not a ProjectTypeAgent');
    return res.status(404).json({ error: 'Agent not found' });
  }

  await withRetry(
    () => prisma.message.deleteMany({
      where: { agentId: agent.id },
    }),
    3,
    `DELETE /agents/${agentId}/messages - delete messages`
  );

  logger.debug({ agentId: agent.id }, 'Messages deleted successfully');
  res.status(204).send();
});

const fileSchema = z.object({
  name: z.string().min(1),
  mimeType: z.string().min(1),
  content: z.string().min(1),
  isKnowledgeBase: z.boolean().optional().default(false),
});

router.post('/:agentId/files', async (_req, res) => {
  return forbidAgentMutation(res);
});

// GET /:agentId/files - получить файлы агента (база знаний)
router.get('/:agentId/files', async (req, res, next) => {
  const { agentId } = req.params;
  try {
    const userId = req.userId!;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Сначала пытаемся найти обычного агента
    let agent = await withRetry(
      () => prisma.agent.findFirst({
        where: { id: agentId, userId },
      }),
      3,
      `GET /agents/${agentId}/files - find agent`
    );

    // Если агент не найден, проверяем, является ли это ProjectTypeAgent шаблоном
    // Для ProjectTypeAgent файлы хранятся с agentId = projectTypeAgentId
    if (!agent) {
      try {
        const projectTypeAgent = await withRetry(
          () => (prisma as any).projectTypeAgent.findUnique({
            where: { id: agentId },
          }),
          3,
          `GET /agents/${agentId}/files - check if ProjectTypeAgent`
        );

        if (projectTypeAgent) {
          const files = await withRetry(
            () => prisma.file.findMany({
              where: {
                projectTypeAgentId: agentId,
                isKnowledgeBase: true,
                name: {
                  not: {
                    startsWith: 'Summary'
                  }
                }
              },
              select: {
                id: true,
                agentId: true,
                projectTypeAgentId: true,
                name: true,
                mimeType: true,
                content: true,
                isKnowledgeBase: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'desc' },
            } as any),
            3,
            `GET /agents/${agentId}/files - load template files`
          );

          logger.debug({ agentId, filesCount: files.length }, 'Files fetched for ProjectTypeAgent template');
          return res.json({ files });
        }
      } catch (error: any) {
        logger.error({ agentId, userId, error: error.message, code: error.code }, 'Error checking ProjectTypeAgent for files');
      }
    }

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

    logger.info({
      agentId,
      userId,
      projectId,
      hasProjectId: !!projectId
    }, 'GET /agents/:agentId/files/summary - request received');

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!projectId) {
      logger.warn({ agentId, userId }, 'projectId query parameter is missing');
      return res.status(400).json({
        error: 'projectId query parameter is required. Project isolation requires explicit project context.'
      });
    }

    // Проверяем, что проект принадлежит пользователю
    const project = await withRetry(
      () => prisma.project.findFirst({
        where: { id: projectId, userId },
      }),
      3,
      `GET /agents/${agentId}/files/summary - verify project ${projectId}`
    );

    if (!project) {
      logger.warn({ agentId, userId, projectId }, 'Project not found or does not belong to user');
      return res.status(404).json({ error: 'Project not found' });
    }

    // Используем функцию для получения или создания агента из шаблона
    const agent = await getOrCreateAgentFromTemplate(agentId, userId, projectId);

    if (!agent) {
      logger.warn({ agentId, userId, projectId }, 'Agent not found and not a ProjectTypeAgent');
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Получаем всех агентов проекта для загрузки их файлов
    // Проект уже проверен на принадлежность пользователю, поэтому все агенты проекта принадлежат пользователю
    const projectAgents = await withRetry(
      () => prisma.agent.findMany({
        where: { projectId: projectId, userId }, // Добавляем проверку userId для дополнительной безопасности
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
          dslContent: true,
          verstkaContent: true,
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

  if (!file.agent || file.agent.userId !== userId) {
    if (!file.agent) {
      logger.warn({ fileId, userId }, 'File does not belong to an agent (possibly ProjectTypeAgent file)');
    } else {
      logger.warn({ fileId, fileUserId: file.agent.userId, currentUserId: userId }, 'Attempt to delete file belonging to different user');
    }
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

router.delete('/:agentId/files/:fileId', async (_req, res) => {
  return forbidAgentMutation(res);
});

// PATCH /agents/files/:fileId - Update file content
router.patch('/files/:fileId', async (req, res) => {
  const { fileId } = req.params;
  const userId = (req as any).userId;
  const { content } = req.body;

  logger.info({ fileId, userId }, 'PATCH /agents/files/:fileId - request received');

  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'Content is required and must be a string' });
  }

  try {
    // 1. Get the file and verify ownership/access
    const file = await withRetry(
      () => prisma.file.findFirst({
        where: { id: fileId },
        include: { agent: true },
      }),
      3,
      `PATCH /agents/files/${fileId} - find file`
    );

    if (!file) {
      logger.warn({ fileId, userId }, 'File not found for update');
      return res.status(404).json({ error: 'File not found' });
    }

    // 2. Check access (similar to delete logic)
    if (!file.agent || file.agent.userId !== userId) {
      if (!file.agent) {
        logger.warn({ fileId, userId }, 'File does not belong to an agent');
      } else {
        logger.warn({ fileId, fileUserId: file.agent.userId, currentUserId: userId }, 'Attempt to update file belonging to different user');
      }
      return res.status(403).json({ error: 'Access denied. File belongs to different user.' });
    }

    // 3. Update file content
    const updatedFile = await withRetry(
      () => prisma.file.update({
        where: { id: fileId },
        data: { content },
      }),
      3,
      `PATCH /agents/files/${fileId} - update file`
    );

    logger.info({ fileId, userId, contentLength: content.length }, 'File content updated');

    res.status(200).json({
      file: {
        id: updatedFile.id,
        name: updatedFile.name,
        mimeType: updatedFile.mimeType,
        content: updatedFile.content,
        agentId: updatedFile.agentId,
        dslContent: updatedFile.dslContent,
        verstkaContent: updatedFile.verstkaContent,
      }
    });
  } catch (error) {
    logger.error({
      fileId,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, 'File update failed');
    res.status(500).json({ error: 'Failed to update file' });
  }
});

router.post('/:agentId/summary', async (req, res) => {
  const userId = req.userId!;
  const { agentId } = req.params;
  const projectId = req.query.projectId as string | undefined;

  logger.info({
    agentId,
    userId,
    projectId,
    hasProjectId: !!projectId
  }, 'POST /agents/:agentId/summary - request received');

  if (!projectId) {
    logger.warn({ agentId, userId }, 'projectId query parameter is missing');
    return res.status(400).json({
      error: 'projectId query parameter is required. Project isolation requires explicit project context.'
    });
  }

  // Используем функцию для получения или создания агента из шаблона
  const agent = await getOrCreateAgentFromTemplate(agentId, userId, projectId);

  if (!agent) {
    logger.warn({ agentId, userId, projectId }, 'Agent not found and not a ProjectTypeAgent');
    return res.status(404).json({ error: 'Agent not found' });
  }

  // Используем ID созданного/найденного агента для загрузки сообщений
  const actualAgentId = agent.id;

  const messages = await withRetry(
    () => prisma.message.findMany({
      where: { agentId: actualAgentId },
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
    logger.debug({ agentId: actualAgentId, userId, messagesCount: messages.length }, 'Generating summary');

    const summaryText = await generateSummaryContent(agent, transcript);
    const fileName = `Summary - ${agent.name} - ${new Date().toLocaleString()}`;

    const file = await withRetry(
      () => prisma.file.create({
        data: {
          agentId: actualAgentId, // Используем ID созданного/найденного агента
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
      agentId: actualAgentId,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, 'Summary generation failed');
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});


// POST /:agentId/files/:fileId/generate-prototype
router.post('/:agentId/files/:fileId/generate-prototype', async (req, res) => {
  const { agentId, fileId } = req.params;
  const userId = (req as any).userId;

  logger.info({ agentId, fileId, userId }, 'POST /agents/:agentId/files/:fileId/generate-prototype - request received');

  try {
    // 1. Get the file and verify ownership/access
    const file = await withRetry(
      () => prisma.file.findFirst({
        where: { id: fileId },
        include: { agent: true }
      }),
      3,
      `POST /agents/${agentId}/files/${fileId}/generate-prototype - find file`
    );

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // 2. Get the project to find other agents
    const projectId = file.agent?.projectId;
    if (!projectId) {
      return res.status(400).json({ error: 'File is not associated with a project' });
    }

    // 3. Find DSL and Verstka agents in the project
    const projectAgents = await withRetry(
      () => prisma.agent.findMany({
        where: { projectId }
      }),
      3,
      `POST /agents/${agentId}/files/${fileId}/generate-prototype - find project agents`
    );

    // Helper to find agent by role
    const findAgentByRole = (roleName: string) => {
      const found = projectAgents.find(a => {
        const roles = (a.role || '').split(',').map(r => r.trim().toLowerCase());
        const hasRole = roles.includes(roleName.toLowerCase());

        // Detailed logging for debugging
        logger.info({
          agentId: a.id,
          agentName: a.name,
          agentRole: a.role,
          parsedRoles: roles,
          searchingFor: roleName.toLowerCase(),
          hasRole
        }, `Checking agent for role ${roleName}`);

        return hasRole;
      });

      logger.info({
        roleName,
        found: !!found,
        foundAgentId: found?.id,
        foundAgentName: found?.name,
        totalProjectAgents: projectAgents.length,
        allAgentRoles: projectAgents.map(a => ({ id: a.id, name: a.name, role: a.role }))
      }, `Find agent by role ${roleName} result`);

      return found;
    };

    const dslAgent = findAgentByRole('dsl');
    const verstkaAgent = findAgentByRole('layout');

    if (!dslAgent) {
      return res.status(400).json({ error: 'DSL agent not found in project' });
    }
    if (!verstkaAgent) {
      return res.status(400).json({ error: 'Verstka agent not found in project' });
    }

    // 4. Generate DSL
    logger.info({ fileId, dslAgentId: dslAgent.id }, 'Generating DSL content');

    // Prepare agent with files (empty files list for now as we pass content directly)
    const dslAgentWithFiles = { ...dslAgent, files: [] };

    const dslContent = await generateDocumentResult(
      dslAgentWithFiles,
      decodeBase64ToText(file.content),
      'dsl'
    );

    // 5. Generate HTML (Verstka)
    logger.info({ fileId, verstkaAgentId: verstkaAgent.id }, 'Generating Verstka content');

    const verstkaAgentWithFiles = { ...verstkaAgent, files: [] };

    const verstkaContent = await generateDocumentResult(
      verstkaAgentWithFiles,
      dslContent,
      'verstka'
    );

    // 6. Save to DB
    const updatedFile = await withRetry(
      () => prisma.file.update({
        where: { id: fileId },
        data: {
          dslContent,
          verstkaContent
        }
      }),
      3,
      `POST /agents/${agentId}/files/${fileId}/generate-prototype - update file`
    );

    logger.info({ fileId, hasDsl: !!dslContent, hasVerstka: !!verstkaContent }, 'Prototype generated and saved');

    res.json({ file: updatedFile });
  } catch (error) {
    logger.error({
      agentId,
      fileId,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, 'Prototype generation failed');
    res.status(500).json({ error: 'Failed to generate prototype' });
  }
});

export default router;
