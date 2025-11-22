import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { generateAgentResponse, generateSummaryContent } from '../services/openaiService';

const router = Router();

const agentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  systemInstruction: z.string().optional(),
  summaryInstruction: z.string().optional(),
  model: z.string().optional(),
  role: z.string().optional(),
});

const reorderSchema = z.object({
  orders: z.array(z.object({
    id: z.string().min(1),
    order: z.number().int(),
  })).min(1),
});

const getNextOrderValue = async (userId: string) => {
  const lastAgent = await prisma.agent.findFirst({
    where: { userId },
    orderBy: { order: 'desc' },
    select: { order: true },
  });
  return (lastAgent?.order ?? -1) + 1;
};

router.get('/', async (req, res) => {
  const userId = req.userId!;
  
  const agents = await prisma.agent.findMany({
    where: { userId },
    include: {
      files: {
        where: {
          isKnowledgeBase: true,  // Только база знаний
          name: {
            not: {
              startsWith: 'Summary'
            }
          }
        }
      }
    },
    orderBy: [
      { order: 'asc' },
      { createdAt: 'asc' },
    ],
  });

  console.log(`[GET /agents] Загружено агентов для пользователя ${userId}:`, agents.length);
  console.log(`[GET /agents] Список агентов:`, agents.map(a => ({
    id: a.id,
    name: a.name,
    role: a.role || '(нет роли)',
    systemInstructionLength: a.systemInstruction?.length || 0,
    filesCount: a.files.length,
  })));

  res.json({ agents });
});

router.post('/', async (req, res) => {
  const userId = req.userId!;
  const parsed = agentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const nextOrder = await getNextOrderValue(userId);

  const agent = await prisma.agent.create({
    data: {
      userId,
      name: parsed.data.name,
      description: parsed.data.description ?? '',
      systemInstruction: parsed.data.systemInstruction ?? '',
      summaryInstruction: parsed.data.summaryInstruction ?? '',
      model: parsed.data.model ?? 'gpt-5.1',
      role: parsed.data.role ?? '',
      order: nextOrder,
    },
  });

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

  const ownedAgents = await prisma.agent.findMany({
    where: {
      userId,
      id: { in: agentIds },
    },
    select: { id: true },
  });

  if (ownedAgents.length !== agentIds.length) {
    return res.status(403).json({ error: 'One or more agents do not belong to the user' });
  }

  const updates = orders.map(({ id, order }) =>
    prisma.agent.update({
      where: { id },
      data: { order },
    })
  );

  await prisma.$transaction(updates);

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
    const existing = await prisma.agent.findFirst({ where: { id: agentId, userId } });
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

    const updated = await prisma.agent.update({
      where: { id: agentId },
      data: parsed.data,
    });

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
    const verify = await prisma.agent.findUnique({
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
    });

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
    const existing = await prisma.agent.findFirst({ 
      where: { id: agentId, userId },
      include: { user: { select: { id: true, email: true } } }
    });

    console.log(`[DELETE /:agentId] Результат поиска агента:`, existing ? {
      id: existing.id,
      name: existing.name,
      userId: existing.userId,
      userEmail: existing.user.email
    } : 'не найден');

    if (!existing) {
      // Проверяем, может быть агент существует, но принадлежит другому пользователю
      const agentExists = await prisma.agent.findFirst({ where: { id: agentId } });
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
    await prisma.agent.delete({ where: { id: agentId } });
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

  const agent = await prisma.agent.findFirst({
    where: { id: agentId, userId },
  });
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  const messages = await prisma.message.findMany({
    where: { agentId },
    orderBy: { createdAt: 'asc' },
  });

  res.json({ messages });
});

const messageSchema = z.object({
  text: z.string().min(1),
});

router.post('/:agentId/messages', async (req, res) => {
  const userId = req.userId!;
  const { agentId } = req.params;
  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const agent = await prisma.agent.findFirst({
    where: { id: agentId, userId },
    include: { files: true },
  });
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  // Загружаем только документы проекта (НЕ базу знаний агентов)
  // Используем те же файлы, что и в эндпоинте /files/summary для консистентности
  const allProjectFiles = await prisma.file.findMany({
    where: {
      agent: { userId },
      isKnowledgeBase: false,  // Исключаем базу знаний
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
  });

  // Используем только документы проекта (без базы знаний)
  // Это гарантирует, что агент видит те же документы, что и в папке "Документы проекта"
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

  const history = await prisma.message.findMany({
    where: { agentId },
    orderBy: { createdAt: 'asc' },
    take: 50,
  });

  const userMessage = await prisma.message.create({
    data: {
      agentId,
      userId,
      role: 'USER',
      text: parsed.data.text,
    },
  });

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

    const modelMessage = await prisma.message.create({
      data: {
        agentId,
        role: 'MODEL',
        text: responseText,
      },
    });

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

  const agent = await prisma.agent.findFirst({
    where: { id: agentId, userId },
  });

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  await prisma.message.deleteMany({
    where: { agentId },
  });

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

  const agent = await prisma.agent.findFirst({ where: { id: agentId, userId } });
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

  const file = await prisma.file.create({
    data: {
      agentId,
      name: parsed.data.name,
      mimeType: parsed.data.mimeType,
      content: parsed.data.content,
      isKnowledgeBase: parsed.data.isKnowledgeBase ?? false,
    },
  });

  console.log(`[POST /:agentId/files] ✅ Файл создан:`);
  console.log(`  - File ID: ${file.id}`);
  console.log(`  - File Name: ${file.name}`);
  console.log(`  - Agent ID: ${file.agentId}`);
  console.log(`  - Created At: ${file.createdAt}`);

  // Проверяем общее количество файлов для этого пользователя
  const totalFiles = await prisma.file.count({
    where: {
      agent: { userId }
    }
  });
  console.log(`[POST /:agentId/files] 📊 Всего файлов у пользователя: ${totalFiles}`);

  res.status(201).json({ file });
});

router.get('/:agentId/files/summary', async (req, res) => {
  const userId = req.userId!;
  const { agentId } = req.params;

  const agent = await prisma.agent.findFirst({
    where: { id: agentId, userId },
  });

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  // Загружаем только документы проекта (НЕ базу знаний агентов)
  const projectFiles = await prisma.file.findMany({
    where: {
      agent: { userId },
      isKnowledgeBase: false,  // Исключаем базу знаний
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
  });

  // Логирование для диагностики
  console.log(`[Summary Files Debug] Agent: ${agentId}`);
  console.log(`[Summary Files Debug] Project documents (excluding knowledge base): ${projectFiles.length}`);
  console.log(`[Summary Files Debug] Project file names:`, projectFiles.map(f => f.name));

  res.json({ files: projectFiles });
});

// ВАЖНО: Этот маршрут должен быть ВЫШЕ /:agentId/files/:fileId
// чтобы Express не интерпретировал '/files' как ':agentId'
router.delete('/files/:fileId', async (req, res) => {
  const userId = req.userId!;
  const { fileId } = req.params;

  console.log(`[DELETE /files/:fileId] Удаление файла:`, { fileId, userId });

  const file = await prisma.file.findFirst({
    where: { id: fileId },
    include: { agent: true },
  });

  if (!file) {
    console.log(`[DELETE /files/:fileId] Файл не найден: ${fileId}`);
    return res.status(404).json({ error: 'File not found' });
  }

  if (file.agent.userId !== userId) {
    console.log(`[DELETE /files/:fileId] Доступ запрещен: файл принадлежит другому пользователю`);
    return res.status(403).json({ error: 'Access denied. File belongs to different user.' });
  }

  await prisma.file.delete({ where: { id: fileId } });
  console.log(`[DELETE /files/:fileId] ✅ Файл удален: ${file.name} (${fileId})`);

  res.status(204).send();
});

router.delete('/:agentId/files/:fileId', async (req, res) => {
  const userId = req.userId!;
  const { agentId, fileId } = req.params;

  // Проверяем, что агент существует и принадлежит пользователю (для валидации запроса)
  const agent = await prisma.agent.findFirst({
    where: { id: agentId, userId },
  });

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  // Находим файл с информацией о его агенте
  const file = await prisma.file.findFirst({
    where: { id: fileId },
    include: { agent: true },
  });

  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Проверяем, что файл принадлежит любому агенту этого пользователя
  // Если userId агента файла совпадает с userId запрашивающего агента - можно удалять
  if (file.agent.userId !== userId) {
    return res.status(403).json({ error: 'Access denied. File belongs to different user.' });
  }

  // Удаляем файл - теперь все проверки пройдены
  await prisma.file.delete({ where: { id: fileId } });
  
  res.status(204).send();
});

router.post('/:agentId/summary', async (req, res) => {
  const userId = req.userId!;
  const { agentId } = req.params;

  const agent = await prisma.agent.findFirst({
    where: { id: agentId, userId },
    include: { files: true },
  });

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  const messages = await prisma.message.findMany({
    where: { agentId },
    orderBy: { createdAt: 'asc' },
  });

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

    const file = await prisma.file.create({
      data: {
        agentId,
        name: fileName,
        mimeType: 'text/markdown',
        content: Buffer.from(summaryText, 'utf-8').toString('base64'),
        isKnowledgeBase: false,  // Summary файлы - это документы проекта, не база знаний
      },
    });

    console.log(`[POST /:agentId/summary] ✅ Файл создан:`);
    console.log(`  - File ID: ${file.id}`);
    console.log(`  - File Name: ${file.name}`);
    console.log(`  - Agent ID: ${file.agentId}`);
    console.log(`  - Created At: ${file.createdAt}`);

    // Проверяем общее количество файлов для этого пользователя
    const totalFiles = await prisma.file.count({
      where: {
        agent: { userId }
      }
    });
    console.log(`[POST /:agentId/summary] 📊 Всего файлов у пользователя: ${totalFiles}`);

    res.status(201).json({ file });
  } catch (error) {
    console.error('[POST /:agentId/summary] ❌ Summary generation failed:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

export default router;

