import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { generateAgentResponse, generateSummaryContent } from '../services/openaiService';
import { withRetry } from '../utils/prismaRetry';

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
    
    // Оптимизация: НЕ загружаем файлы при загрузке списка агентов
    // Файлы (база знаний) загружаются отдельно, когда нужно
    // Это значительно ускоряет загрузку рабочего пространства
    const agents = await withRetry(
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
    );

    // Также загружаем агентов типа проекта, если указан projectId
    // Оптимизация: делаем запросы параллельно
    let projectTypeAgents: any[] = [];
    if (projectId) {
      // Загружаем проект и агентов типа проекта параллельно
      const [project, projectTypeAgentsResult] = await Promise.all([
        withRetry(
          () => prisma.project.findUnique({
            where: { id: projectId },
            select: { projectTypeId: true },
          }),
          3,
          `GET /agents - find project ${projectId}`
        ),
        // Пытаемся загрузить агентов типа проекта сразу (если projectTypeId известен из предыдущего запроса)
        // Но так как projectTypeId неизвестен, делаем это последовательно после получения проекта
        Promise.resolve(null as any),
      ]);
      
      if (project?.projectTypeId) {
        projectTypeAgents = await withRetry(
          // ProjectTypeAgent model exists but may not be in generated types yet
          () => (prisma as any).projectTypeAgent.findMany({
            where: { projectTypeId: project.projectTypeId },
            orderBy: [
              { order: 'asc' },
              { createdAt: 'asc' },
            ],
          }),
          3,
          `GET /agents - find projectTypeAgents for ${project.projectTypeId}`
        );
      }
    }

    // Добавляем пустой массив files для каждого агента (для совместимости с фронтендом)
    const agentsWithEmptyFiles = agents.map(agent => ({
      ...agent,
      files: [],
    }));

    console.log(`[GET /agents] Загружено агентов для пользователя ${userId}:`, agents.length);
    console.log(`[GET /agents] Загружено агентов типа проекта:`, projectTypeAgents.length);

    res.json({ 
      agents: agentsWithEmptyFiles,
      projectTypeAgents: projectTypeAgents.length > 0 ? projectTypeAgents : undefined
    });
  } catch (error: any) {
    console.error('[GET /agents] Error:', error);
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
  console.log('[POST /agents/reorder] Request received');
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

  console.log('[POST /agents/reorder] Successfully reordered agents');
  res.json({ success: true });
});

router.put('/:agentId', async (req, res) => {
  const userId = req.userId!;
  const { agentId } = req.params;
  
  console.log(`[PUT /:agentId] Обновление агента:`, { 
    agentId, 
    userId, 
    updatingFields: Object.keys(req.body) 
  });

  const parsed = agentSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    console.error(`[PUT /:agentId] Ошибка валидации данных:`, parsed.error.flatten());
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const existing = await withRetry(
      () => prisma.agent.findFirst({ where: { id: agentId, userId } }),
      3,
      `PUT /agents/${agentId} - find existing`
    );
    if (!existing) {
      console.error(`[PUT /:agentId] Агент не найден:`, { agentId, userId });
      return res.status(404).json({ error: 'Agent not found' });
    }

    console.log(`[PUT /:agentId] Текущее состояние агента:`, {
      id: existing.id,
      name: existing.name,
      role: existing.role || '(нет роли)',
      systemInstructionLength: existing.systemInstruction?.length || 0,
      summaryInstructionLength: existing.summaryInstruction?.length || 0,
      model: existing.model,
      updatedAt: existing.updatedAt,
    });

    const updated = await withRetry(
      () => prisma.agent.update({
        where: { id: agentId },
        data: parsed.data,
      }),
      3,
      `PUT /agents/${agentId} - update`
    );

    console.log(`[PUT /:agentId] ✅ Обновление выполнено через Prisma:`, {
      id: updated.id,
      name: updated.name,
      role: updated.role || '(нет роли)',
      systemInstructionLength: updated.systemInstruction?.length || 0,
      summaryInstructionLength: updated.summaryInstruction?.length || 0,
      model: updated.model,
      updatedAt: updated.updatedAt,
    });

    // Проверяем сохранность данных - повторно запрашиваем из БД
    const verify = await withRetry(
      () => prisma.agent.findUnique({
        where: { id: agentId },
        select: {
          id: true,
          name: true,
          role: true,
          systemInstruction: true,
          summaryInstruction: true,
          model: true,
          updatedAt: true,
        },
      }),
      3,
      `PUT /agents/${agentId} - verify`
    );

    if (!verify) {
      console.error(`[PUT /:agentId] ❌ КРИТИЧЕСКАЯ ОШИБКА: Агент не найден после обновления!`);
      return res.status(500).json({ 
        error: 'Agent update verification failed - agent not found after update' 
      });
    }

    // Проверяем, что критичные поля действительно сохранились
    const criticalFieldsMatch = 
      verify.name === updated.name &&
      verify.systemInstruction === updated.systemInstruction &&
      verify.summaryInstruction === updated.summaryInstruction &&
      verify.model === updated.model;

    if (!criticalFieldsMatch) {
      console.error(`[PUT /:agentId] ❌ КРИТИЧЕСКАЯ ОШИБКА: Данные не совпадают после проверки сохранности!`, {
        expected: {
          name: updated.name,
          systemInstructionLength: updated.systemInstruction?.length,
          summaryInstructionLength: updated.summaryInstruction?.length,
          model: updated.model,
        },
        actual: {
          name: verify.name,
          systemInstructionLength: verify.systemInstruction?.length,
          summaryInstructionLength: verify.summaryInstruction?.length,
          model: verify.model,
        },
      });
      return res.status(500).json({ 
        error: 'Agent update verification failed - data mismatch' 
      });
    }

    console.log(`[PUT /:agentId] ✅ Проверка сохранности успешна:`, {
      id: verify.id,
      name: verify.name,
      role: verify.role || '(нет роли)',
      systemInstructionLength: verify.systemInstruction?.length || 0,
      summaryInstructionLength: verify.summaryInstruction?.length || 0,
      model: verify.model,
      updatedAt: verify.updatedAt,
    });

    res.json({ agent: updated });
  } catch (error) {
    console.error(`[PUT /:agentId] ❌ Ошибка при обновлении агента:`, {
      agentId,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return res.status(500).json({ 
      error: 'Failed to update agent',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.delete('/:agentId', async (req, res) => {
  const userId = req.userId!;
  const { agentId } = req.params;

  console.log(`[DELETE /:agentId] Попытка удаления агента:`, { agentId, userId });

  try {
    // Проверяем, существует ли агент с таким ID у пользователя
    const existing = await withRetry(
      () => prisma.agent.findFirst({ 
        where: { id: agentId, userId },
        include: { user: { select: { id: true, username: true } } }
      }),
      3,
      `DELETE /agents/${agentId} - find existing`
    );

    console.log(`[DELETE /:agentId] Результат поиска агента:`, existing ? {
      id: existing.id,
      name: existing.name,
      userId: existing.userId,
      username: existing.user.username
    } : 'не найден');

    if (!existing) {
      // Проверяем, может быть агент существует, но принадлежит другому пользователю
      const agentExists = await withRetry(
        () => prisma.agent.findFirst({ where: { id: agentId } }),
        3,
        `DELETE /agents/${agentId} - check if exists`
      );
      if (agentExists) {
        console.log(`[DELETE /:agentId] Агент найден, но принадлежит другому пользователю:`, {
          agentId,
          agentUserId: agentExists.userId,
          currentUserId: userId
        });
        return res.status(403).json({ error: 'Access denied. Agent belongs to different user.' });
      }
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Запрещаем удаление агентов с ролью
    if (existing.role && existing.role.trim() !== '') {
      console.log(`[DELETE /:agentId] Попытка удалить агента с ролью:`, { agentId, role: existing.role });
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
    console.log(`[DELETE /:agentId] ✅ Агент успешно удален:`, { agentId, name: existing.name });
    
    res.status(204).send();
  } catch (error) {
    console.error(`[DELETE /:agentId] ❌ Ошибка при удалении агента:`, {
      agentId,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
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

  const agent = await withRetry(
    () => prisma.agent.findFirst({
      where: { id: agentId, userId },
    }),
    3,
    `GET /agents/${agentId}/messages - find agent`
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
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const agent = await withRetry(
    () => prisma.agent.findFirst({
      where: { id: agentId, userId },
      include: { files: true },
    }),
    3,
    `POST /agents/${agentId}/messages - find agent`
  );
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  // Загружаем документы проекта (НЕ база знаний агентов)
  // projectId обязателен для изоляции проектов
  if (!parsed.data.projectId) {
    return res.status(400).json({ 
      error: 'projectId is required. Project isolation requires explicit project context.' 
    });
  }

  // Получаем всех агентов проекта для загрузки их файлов
  const projectAgents = await withRetry(
    () => prisma.agent.findMany({
      where: { projectId: parsed.data.projectId },
      select: { id: true },
    }),
    3,
    `POST /agents/${agentId}/messages - find project agents`
  );
  const agentIds = projectAgents.map(a => a.id);

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

  // Используем только документы проекта (без базы знаний)
  const allFiles = allProjectFiles;

  // Логирование для диагностики
  console.log(`[POST /:agentId/messages] Agent: ${agent.name} (${agent.id})`);
  console.log(`[POST /:agentId/messages] Agent's own files: ${agent.files.length}`);
  console.log(`[POST /:agentId/messages] All project files (from all agents): ${allProjectFiles.length}`);
  console.log(`[POST /:agentId/messages] Total files for prompt: ${allFiles.length}`);
  console.log(`[POST /:agentId/messages] Project file names:`, allProjectFiles.map(f => f.name));
  console.log(`[POST /:agentId/messages] File agentIds:`, allProjectFiles.map(f => ({ name: f.name, agentId: f.agentId })));

  // Создаем объект агента со всеми файлами проекта
  const agentWithAllFiles = {
    ...agent,
    files: allFiles,
  };

  const history = await withRetry(
    () => prisma.message.findMany({
      where: { agentId },
      orderBy: { createdAt: 'asc' },
      take: 50,
    }),
    3,
    `POST /agents/${agentId}/messages - find history`
  );

  const userMessage = await withRetry(
    () => prisma.message.create({
      data: {
        agentId,
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
          agentId,
          role: 'MODEL',
          text: responseText,
        },
      }),
      3,
      `POST /agents/${agentId}/messages - create model message`
    );

    return res.json({ messages: [userMessage, modelMessage] });
  } catch (error) {
    console.error('OpenAI error', error);
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

  console.log(`[POST /:agentId/files] Создание файла:`);
  console.log(`  - Agent ID: ${agentId}`);
  console.log(`  - Agent Name: ${agent.name}`);
  console.log(`  - User ID: ${userId}`);
  console.log(`  - File Name: ${parsed.data.name}`);
  console.log(`  - MIME Type: ${parsed.data.mimeType}`);
  console.log(`  - Content Length: ${parsed.data.content.length} chars`);
  console.log(`  - Is Knowledge Base: ${parsed.data.isKnowledgeBase}`);

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

  console.log(`[POST /:agentId/files] ✅ Файл создан:`);
  console.log(`  - File ID: ${file.id}`);
  console.log(`  - File Name: ${file.name}`);
  console.log(`  - Agent ID: ${file.agentId}`);
  console.log(`  - Created At: ${file.createdAt}`);

  // Проверяем общее количество файлов для этого пользователя
  const totalFiles = await withRetry(
    () => prisma.file.count({
      where: {
        agent: { userId }
      }
    }),
    3,
    `POST /agents/${agentId}/files - count files`
  );
  console.log(`[POST /:agentId/files] 📊 Всего файлов у пользователя: ${totalFiles}`);

  res.status(201).json({ file });
});

// GET /:agentId/files - получить файлы агента (база знаний)
router.get('/:agentId/files', async (req, res, next) => {
  try {
    const userId = req.userId!;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { agentId } = req.params;

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
    console.error('[GET /agents/:agentId/files] Error:', error);
    next(error);
  }
});

router.get('/:agentId/files/summary', async (req, res, next) => {
  try {
    const userId = req.userId!;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { agentId } = req.params;
    const projectId = req.query.projectId as string | undefined;

    const agent = await withRetry(
      () => prisma.agent.findFirst({
        where: { id: agentId, userId },
      }),
      3,
      `GET /agents/${agentId}/files/summary - find agent`
    );

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Загружаем документы проекта (НЕ базу знаний агентов)
    // projectId обязателен для изоляции проектов
    if (!projectId) {
      return res.status(400).json({ 
        error: 'projectId query parameter is required. Project isolation requires explicit project context.' 
      });
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
    const agentIds = projectAgents.map(a => a.id);

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

    // Логирование для диагностики
    console.log(`[Summary Files Debug] Agent: ${agentId}`);
    console.log(`[Summary Files Debug] Project documents (excluding knowledge base): ${projectFiles.length}`);
    console.log(`[Summary Files Debug] Project file names:`, projectFiles.map(f => f.name));

    res.json({ files: projectFiles });
  } catch (error: any) {
    console.error('[GET /agents/:agentId/files/summary] Error:', error);
    next(error);
  }
});

// ВАЖНО: Этот маршрут должен быть ВЫШЕ /:agentId/files/:fileId
// чтобы Express не интерпретировал '/files' как ':agentId'
router.delete('/files/:fileId', async (req, res) => {
  const userId = req.userId!;
  const { fileId } = req.params;

  console.log(`[DELETE /files/:fileId] Удаление файла:`, { fileId, userId });

  const file = await withRetry(
    () => prisma.file.findFirst({
      where: { id: fileId },
      include: { agent: true },
    }),
    3,
    `DELETE /agents/files/${fileId} - find file`
  );

  if (!file) {
    console.log(`[DELETE /files/:fileId] Файл не найден: ${fileId}`);
    return res.status(404).json({ error: 'File not found' });
  }

  if (file.agent.userId !== userId) {
    console.log(`[DELETE /files/:fileId] Доступ запрещен: файл принадлежит другому пользователю`);
    return res.status(403).json({ error: 'Access denied. File belongs to different user.' });
  }

  await withRetry(
    () => prisma.file.delete({ where: { id: fileId } }),
    3,
    `DELETE /agents/files/${fileId} - delete file`
  );
  console.log(`[DELETE /files/:fileId] ✅ Файл удален: ${file.name} (${fileId})`);

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
    console.log(`[POST /:agentId/summary] Создание саммари:`);
    console.log(`  - Agent ID: ${agentId}`);
    console.log(`  - Agent Name: ${agent.name}`);
    console.log(`  - User ID: ${userId}`);
    console.log(`  - Messages count: ${messages.length}`);

    const summaryText = await generateSummaryContent(agent, transcript);
    console.log(`[POST /:agentId/summary] Саммари сгенерирован, длина: ${summaryText.length} символов`);

    const fileName = `Summary - ${agent.name} - ${new Date().toLocaleString()}`;
    console.log(`[POST /:agentId/summary] Создание файла: "${fileName}"`);

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

    console.log(`[POST /:agentId/summary] ✅ Файл создан:`);
    console.log(`  - File ID: ${file.id}`);
    console.log(`  - File Name: ${file.name}`);
    console.log(`  - Agent ID: ${file.agentId}`);
    console.log(`  - Created At: ${file.createdAt}`);

    // Проверяем общее количество файлов для этого пользователя
    const totalFiles = await withRetry(
      () => prisma.file.count({
        where: {
          agent: { userId }
        }
      }),
      3,
      `POST /agents/${agentId}/summary - count files`
    );
    console.log(`[POST /:agentId/summary] 📊 Всего файлов у пользователя: ${totalFiles}`);

    res.status(201).json({ file });
  } catch (error) {
    console.error('[POST /:agentId/summary] ❌ Summary generation failed:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

export default router;

