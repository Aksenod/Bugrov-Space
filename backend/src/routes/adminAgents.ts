import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';
import { withRetry } from '../utils/prismaRetry';
import { env } from '../env';
import { syncProjectTypeAgents, syncProjectTypesForTemplate } from '../services/projectTypeSync';

const router = Router();

const agentTemplateSchema = z.object({
  name: z.string().min(1, 'Название агента обязательно'),
  description: z.string().optional().default(''),
  systemInstruction: z.string().optional().default(''),
  summaryInstruction: z.string().optional().default(''),
  model: z.string().optional().default('gpt-5-mini'),
  role: z.string().optional().default(''),
  isHiddenFromSidebar: z.boolean().optional().default(false),
});

// GET / - получить все агенты-шаблоны
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    let agents: any[];
    
    try {
      // Загружаем агентов и их связи через промежуточную таблицу
      const [agentsList, connections] = await Promise.all([
        withRetry(
          () => (prisma as any).projectTypeAgent.findMany({
            orderBy: {
              createdAt: 'desc',
            },
          }),
          3,
          'GET /admin/agents - find agents'
        ) as Promise<any[]>,
        withRetry(
          () => (prisma as any).projectTypeAgentProjectType.findMany({
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
          }),
          3,
          'GET /admin/agents - find connections'
        ) as Promise<any[]>,
      ]);
      
      // Группируем связи по agentId
      const connectionsByAgentId = connections.reduce((acc: any, conn: any) => {
        if (!acc[conn.projectTypeAgentId]) {
          acc[conn.projectTypeAgentId] = [];
        }
        acc[conn.projectTypeAgentId].push({
          projectType: conn.projectType,
          order: conn.order,
        });
        return acc;
      }, {});

      // Преобразуем данные для удобства фронтенда
      const agentsWithProjectTypes = agentsList.map((agent: any) => ({
        id: agent.id,
        name: agent.name,
        description: agent.description || '',
        systemInstruction: agent.systemInstruction || '',
        summaryInstruction: agent.summaryInstruction || '',
        model: agent.model || 'gpt-5.1',
        role: agent.role || '',
        isHiddenFromSidebar: agent.isHiddenFromSidebar || false,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
        projectTypes: (connectionsByAgentId[agent.id] || []).map((pt: any) => ({
          id: pt?.projectType?.id || '',
          name: pt?.projectType?.name || '',
          order: pt?.order || 0,
        })),
      }));
      
      agents = agentsWithProjectTypes;
    } catch (error: any) {
      // Если таблица не существует (миграция не применена), пробуем без include
      if (error?.code === 'P2021' || 
          error?.message?.includes('does not exist') || 
          error?.message?.includes('relation') || 
          error?.message?.includes('column') ||
          error?.message?.includes('Unknown argument') ||
          error?.message?.includes('Unknown field')) {
        logger.warn({ error: error.message, code: error.code }, 'ProjectTypeAgentProjectType table may not exist, trying without relations');
        try {
          const agentsList = await withRetry(
            () => (prisma as any).projectTypeAgent.findMany({
              orderBy: {
                createdAt: 'desc',
              },
            }),
            3,
            'GET /admin/agents - without relations'
          ) as any[];
          
          agents = agentsList.map((agent: any) => ({
            id: agent.id,
            name: agent.name,
            description: agent.description || '',
            systemInstruction: agent.systemInstruction || '',
            summaryInstruction: agent.summaryInstruction || '',
            model: agent.model || 'gpt-5-mini',
            role: agent.role || '',
            isHiddenFromSidebar: agent.isHiddenFromSidebar || false,
            createdAt: agent.createdAt,
            updatedAt: agent.updatedAt,
            projectTypes: [],
          }));
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

    // Преобразуем данные для удобства фронтенда (если еще не преобразовано)
    const agentsWithProjectTypes = agents;

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

const fileSchema = z.object({
  name: z.string().min(1),
  mimeType: z.string().min(1),
  content: z.string().min(1),
  isKnowledgeBase: z.boolean().optional().default(false),
});

// POST /:id/files - загрузить файл для агента-шаблона (должен быть ПЕРЕД /:id)
router.post('/:id/files', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const parsed = fileSchema.safeParse(req.body);
  if (!parsed.success) {
    const errorMessages = parsed.error.issues.map((err) => {
      if (err.path.length > 0) {
        return `${err.path.join('.')}: ${err.message}`;
      }
      return err.message;
    }).join(', ');
    return res.status(400).json({ error: `Validation error: ${errorMessages}` });
  }

  // Проверяем, что агент-шаблон существует
  const agent = await withRetry(
    () => (prisma as any).projectTypeAgent.findUnique({
      where: { id },
    }),
    3,
    `POST /admin/agents/${id}/files - find agent`
  );

  if (!agent) {
    return res.status(404).json({ error: 'Агент не найден' });
  }

  // Проверяем, что пользователь является администратором
  const userId = (req as any).userId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Создаем файл для агента-шаблона
  // Используем поле projectTypeAgentId для связи с ProjectTypeAgent
  try {
    logger.debug({ 
      agentId: id, 
      fileName: parsed.data.name,
      fileSize: parsed.data.content.length,
      isKnowledgeBase: parsed.data.isKnowledgeBase ?? false
    }, 'Attempting to create file for ProjectTypeAgent');

    // Проверяем, что поле projectTypeAgentId доступно в схеме Prisma
    // Это проверка для диагностики проблем с миграциями
    try {
      const testQuery = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'File' 
        AND column_name = 'projectTypeAgentId'
        LIMIT 1
      `;
      if (!testQuery || (Array.isArray(testQuery) && testQuery.length === 0)) {
        logger.error({ agentId: id }, 'Column projectTypeAgentId does not exist in File table - migration may not be applied');
        return res.status(500).json({ 
          error: 'Ошибка базы данных: поле projectTypeAgentId не найдено в таблице File. Миграция базы данных не применена. Обратитесь к администратору.' 
        });
      }
      logger.debug({ agentId: id }, 'Column projectTypeAgentId exists in File table');
    } catch (schemaCheckError: any) {
      logger.warn({ 
        agentId: id, 
        error: schemaCheckError.message 
      }, 'Could not verify column existence, proceeding anyway');
    }

    const file = await withRetry(
      () => prisma.file.create({
        data: {
          projectTypeAgentId: id, // Используем projectTypeAgentId вместо agentId
          agentId: null, // agentId должен быть null для файлов агентов-шаблонов
          name: parsed.data.name,
          mimeType: parsed.data.mimeType,
          content: parsed.data.content,
          isKnowledgeBase: parsed.data.isKnowledgeBase ?? false,
        },
      }),
      3,
      `POST /admin/agents/${id}/files - create file`
    );
    
    const fileData = file;

    logger.debug({ 
      fileId: fileData.id, 
      fileName: fileData.name, 
      projectTypeAgentId: fileData.projectTypeAgentId,
      agentId: fileData.agentId,
      isKnowledgeBase: fileData.isKnowledgeBase,
      createdAt: fileData.createdAt
    }, 'File created successfully for ProjectTypeAgent');

    // Проверяем, что файл действительно создан
    const verifyFile = await withRetry(
      () => prisma.file.findUnique({
        where: { id: fileData.id },
        select: {
          id: true,
          agentId: true,
          projectTypeAgentId: true,
          name: true,
        },
      }),
      3,
      `POST /admin/agents/${id}/files - verify file`
    );

    if (!verifyFile) {
      logger.error({ fileId: fileData.id }, 'File was not created in database after create operation');
      return res.status(500).json({ error: 'Не удалось создать файл. Файл не найден после создания.' });
    }

    logger.info({ 
      fileId: fileData.id, 
      fileName: fileData.name, 
      projectTypeAgentId: fileData.projectTypeAgentId,
      verified: true
    }, 'File created and verified for ProjectTypeAgent');

    await syncProjectTypesForTemplate(id);
    res.status(201).json({ 
      file: {
        id: fileData.id,
        agentId: fileData.projectTypeAgentId || fileData.agentId, // Для совместимости возвращаем projectTypeAgentId как agentId
        name: fileData.name,
        mimeType: fileData.mimeType,
        content: fileData.content,
        isKnowledgeBase: fileData.isKnowledgeBase,
        createdAt: fileData.createdAt,
      }
    });
  } catch (error: any) {
    // Детальное логирование ошибки Prisma
    const errorDetails: any = {
      agentId: id,
      fileName: parsed.data.name,
      errorMessage: error.message,
      errorName: error.name,
      errorCode: error.code,
      errorMeta: error.meta,
      stack: error.stack,
    };

    // Проверяем, является ли это ошибкой Prisma
    if (error.code) {
      errorDetails.prismaErrorCode = error.code;
      errorDetails.prismaErrorMeta = error.meta;
      
      // Специальная обработка для ошибки о несуществующем поле
      if (error.message?.includes('Unknown field') || error.message?.includes('projectTypeAgentId')) {
        logger.error(errorDetails, 'POST /admin/agents/:id/files error - field projectTypeAgentId may not exist in database schema');
        return res.status(500).json({ 
          error: 'Ошибка базы данных: поле projectTypeAgentId не найдено. Возможно, миграция не применена. Обратитесь к администратору.' 
        });
      }

      // Обработка ошибки внешнего ключа
      if (error.code === 'P2003') {
        logger.error(errorDetails, 'POST /admin/agents/:id/files error - foreign key constraint violation');
        return res.status(400).json({ 
          error: 'Ошибка: агент-шаблон не найден или некорректный ID.' 
        });
      }

      // Обработка других ошибок Prisma
      logger.error(errorDetails, 'POST /admin/agents/:id/files error - Prisma error');
      return res.status(500).json({ 
        error: `Ошибка базы данных: ${error.message || 'Неизвестная ошибка'}. Код ошибки: ${error.code}` 
      });
    }

    // Обработка обычных ошибок
    logger.error(errorDetails, 'POST /admin/agents/:id/files error - unknown error');
    throw error;
  }
}));

// GET /:id/files - получить файлы агента-шаблона (должен быть ПЕРЕД /:id)
router.get('/:id/files', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Проверяем, что агент-шаблон существует
  const agent = await withRetry(
    () => (prisma as any).projectTypeAgent.findUnique({
      where: { id },
    }),
    3,
    `GET /admin/agents/${id}/files - find agent`
  );

  if (!agent) {
    return res.status(404).json({ error: 'Агент не найден' });
  }

  // Проверяем, что пользователь является администратором
  const userId = (req as any).userId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Загружаем файлы через Prisma, фильтруя по projectTypeAgentId
  try {
    // Проверяем, что поле projectTypeAgentId доступно в схеме БД
    let fieldExists = true;
    try {
      const testQuery = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'File' 
        AND column_name = 'projectTypeAgentId'
        LIMIT 1
      `;
      if (!testQuery || (Array.isArray(testQuery) && testQuery.length === 0)) {
        fieldExists = false;
        logger.warn({ agentId: id }, 'Column projectTypeAgentId does not exist in File table - migration not applied');
      }
    } catch (schemaCheckError: any) {
      logger.warn({ agentId: id, error: schemaCheckError.message }, 'Could not verify column existence');
      // Продолжаем попытку загрузки файлов
    }

    let files: any[] = [];
    
    if (fieldExists) {
      // Поле существует, используем обычный запрос
      files = await withRetry(
        () => prisma.file.findMany({
          where: {
            projectTypeAgentId: id,
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
        }),
        3,
        `GET /admin/agents/${id}/files - find files`
      );
    } else {
      // Поле не существует, возвращаем пустой список
      logger.info({ agentId: id }, 'Returning empty files list because projectTypeAgentId column does not exist');
      files = [];
    }

    logger.debug({ agentId: id, filesCount: Array.isArray(files) ? files.length : 0 }, 'Files fetched for ProjectTypeAgent');

    res.json({ 
      files: files.map((file) => ({
        id: file.id,
        agentId: file.projectTypeAgentId || file.agentId, // Для совместимости возвращаем projectTypeAgentId как agentId
        name: file.name,
        mimeType: file.mimeType,
        content: file.content,
        isKnowledgeBase: file.isKnowledgeBase,
        createdAt: file.createdAt,
      }))
    });
  } catch (error: any) {
    // Детальное логирование ошибки
    const errorDetails: any = {
      agentId: id,
      errorMessage: error.message,
      errorName: error.name,
      errorCode: error.code,
      errorMeta: error.meta,
      stack: error.stack,
    };

    // Проверяем, является ли это ошибкой Prisma о несуществующем поле
    if (error.message?.includes('Unknown field') || error.message?.includes('projectTypeAgentId') || error.code === 'P2021') {
      logger.error(errorDetails, 'GET /admin/agents/:id/files error - field projectTypeAgentId does not exist in database schema');
      // Возвращаем пустой список файлов, если поле не существует
      return res.json({ files: [] });
    }

    logger.error(errorDetails, 'GET /admin/agents/:id/files error');
    throw error;
  }
}));

// DELETE /:id/files/:fileId - удалить файл агента-шаблона (должен быть ПЕРЕД /:id)
router.delete('/:id/files/:fileId', asyncHandler(async (req: Request, res: Response) => {
  const { id, fileId } = req.params;

  // Проверяем, что агент-шаблон существует
  const agent = await withRetry(
    () => (prisma as any).projectTypeAgent.findUnique({
      where: { id },
    }),
    3,
    `DELETE /admin/agents/${id}/files/${fileId} - find agent`
  );

  if (!agent) {
    return res.status(404).json({ error: 'Агент не найден' });
  }

  // Проверяем, что пользователь является администратором
  const userId = (req as any).userId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Удаляем файл через Prisma
  try {
    // Проверяем, что файл существует и принадлежит этому агенту-шаблону
    const file = await withRetry(
      () => prisma.file.findFirst({
        where: {
          id: fileId,
          projectTypeAgentId: id,
        },
      }),
      3,
      `DELETE /admin/agents/${id}/files/${fileId} - find file`
    );

    if (!file) {
      return res.status(404).json({ error: 'Файл не найден' });
    }

    // Удаляем файл
    await withRetry(
      () => prisma.file.delete({
        where: { id: fileId },
      }),
      3,
      `DELETE /admin/agents/${id}/files/${fileId} - delete file`
    );

    logger.info({ agentId: id, fileId }, 'File deleted for ProjectTypeAgent');
    await syncProjectTypesForTemplate(id);
    res.status(204).send();
  } catch (error: any) {
    logger.error({ agentId: id, fileId, error: error.message, stack: error.stack }, 'DELETE /admin/agents/:id/files/:fileId error');
    throw error;
  }
}));

// GET /:id - получить конкретный агент-шаблон
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const [agent, connections] = await Promise.all([
    withRetry(
      () => (prisma as any).projectTypeAgent.findUnique({
        where: { id },
      }),
      3,
      `GET /admin/agents/${id} - find agent`
    ) as Promise<any>,
    withRetry(
      () => (prisma as any).projectTypeAgentProjectType.findMany({
        where: { projectTypeAgentId: id },
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
      }),
      3,
      `GET /admin/agents/${id} - find connections`
    ) as Promise<any[]>,
  ]);

  if (!agent) {
    return res.status(404).json({ error: 'Агент не найден' });
  }

  const agentWithProjectTypes = {
    id: agent.id,
    name: agent.name,
    description: agent.description || '',
    systemInstruction: agent.systemInstruction || '',
    summaryInstruction: agent.summaryInstruction || '',
    model: agent.model || 'gpt-5-mini',
    role: agent.role || '',
    isHiddenFromSidebar: agent.isHiddenFromSidebar || false,
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
    projectTypes: (connections || []).map((pt: any) => ({
      id: pt?.projectType?.id || '',
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

    const { name, description, systemInstruction, summaryInstruction, model, role, isHiddenFromSidebar } = parsed.data;

    let agent: any;
    try {
      // ProjectTypeAgent не требует projectType при создании - связь устанавливается через промежуточную таблицу
      agent = await withRetry(
        () => (prisma as any).projectTypeAgent.create({
          data: {
            name,
            description: description || '',
            systemInstruction: systemInstruction || '',
            summaryInstruction: summaryInstruction || '',
            model: model || 'gpt-5-mini',
            role: role || '',
            isHiddenFromSidebar: isHiddenFromSidebar || false,
            // НЕ передаем projectType - это many-to-many связь через ProjectTypeAgentProjectType
          },
        }),
        3,
        'POST /admin/agents - create'
      );
    } catch (error: any) {
      // Обработка ошибки валидации Prisma - Prisma Client не перегенерирован
      if (error?.name === 'PrismaClientValidationError' || 
          error?.message?.includes('Argument `projectType` is missing') ||
          error?.message?.includes('Invalid `prisma.projectTypeAgent.create()')) {
        logger.error({ 
          error: error.message, 
          name: error.name,
          code: error.code,
          meta: error.meta,
          stack: error.stack 
        }, 'Prisma Client validation error - client may not be regenerated after schema change');
        return res.status(500).json({ 
          error: 'Prisma Client needs regeneration',
          message: 'The Prisma Client was generated with an old schema. Please redeploy to regenerate the client.',
          details: env.nodeEnv === 'development' ? error.message : undefined
        });
      }
      
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
        name: error.name,
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
  await syncProjectTypesForTemplate(id);
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

  const projectTypeConnections = await withRetry(
    () => (prisma as any).projectTypeAgentProjectType.findMany({
      where: { projectTypeAgentId: id },
      select: { projectTypeId: true },
    }),
    3,
    `DELETE /admin/agents/${id} - load project types`
  ) as Array<{ projectTypeId?: string }>;

  const projectTypeIds = Array.from(
    new Set(
      projectTypeConnections
        .map((connection) => connection.projectTypeId)
        .filter((projectTypeId): projectTypeId is string => Boolean(projectTypeId))
    )
  );

  await withRetry(
    () => (prisma as any).projectTypeAgent.delete({
      where: { id },
    }),
    3,
    `DELETE /admin/agents/${id} - delete`
  );

  logger.info({ agentId: id }, 'Admin agent deleted');
  for (const projectTypeId of projectTypeIds) {
    await syncProjectTypeAgents(projectTypeId);
  }
  res.status(204).send();
}));

// GET /:id/project-types - получить типы проектов, к которым привязан агент
router.get('/:id/project-types', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const [agent, connections] = await Promise.all([
    withRetry(
      () => (prisma as any).projectTypeAgent.findUnique({
        where: { id },
      }),
      3,
      `GET /admin/agents/${id}/project-types - find agent`
    ) as Promise<any>,
    withRetry(
      () => (prisma as any).projectTypeAgentProjectType.findMany({
        where: { projectTypeAgentId: id },
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
      }),
      3,
      `GET /admin/agents/${id}/project-types - find connections`
    ) as Promise<any[]>,
  ]);

  if (!agent) {
    return res.status(404).json({ error: 'Агент не найден' });
  }

  const projectTypes = (connections || []).map((pt: any) => ({
    id: pt?.projectType?.id || '',
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
  for (const projectTypeId of projectTypeIds) {
    await syncProjectTypeAgents(projectTypeId);
  }
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
  await syncProjectTypeAgents(projectTypeId);
  res.status(204).send();
}));

export default router;

