import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { generateAgentResponse, generateSummaryContent, generateDocumentResult } from '../services/openaiService';
import { logger } from '../utils/logger';
import { Buffer } from 'node:buffer';

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

  logger.debug({
    userId,
    agentsCount: agents.length,
    agents: agents.map(a => ({
      id: a.id,
      name: a.name,
      role: a.role || '(нет роли)',
      systemInstructionLength: a.systemInstruction?.length || 0,
      filesCount: a.files.length,
    })),
  }, 'Agents loaded for user');

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
  logger.debug('Agent reorder request received');
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

  logger.info({ userId, agentCount: orders.length }, 'Agents successfully reordered');
  res.json({ success: true });
});

router.put('/:agentId', async (req, res) => {
  const userId = req.userId!;
  const { agentId } = req.params;
  
  logger.debug({
    agentId,
    userId,
    updatingFields: Object.keys(req.body),
  }, 'Updating agent');

  const parsed = agentSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    logger.warn({ agentId, userId, errors: parsed.error.flatten() }, 'Agent update validation failed');
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  try {
    const existing = await prisma.agent.findFirst({ where: { id: agentId, userId } });
    if (!existing) {
      logger.warn({ agentId, userId }, 'Agent not found for update');
      return res.status(404).json({ error: 'Agent not found' });
    }

    logger.debug({
      agentId: existing.id,
      name: existing.name,
      role: existing.role || '(нет роли)',
      systemInstructionLength: existing.systemInstruction?.length || 0,
      summaryInstructionLength: existing.summaryInstruction?.length || 0,
      model: existing.model,
      updatedAt: existing.updatedAt,
    }, 'Current agent state before update');

    const updated = await prisma.agent.update({
      where: { id: agentId },
      data: parsed.data,
    });

    logger.debug({
      agentId: updated.id,
      name: updated.name,
      role: updated.role || '(нет роли)',
      systemInstructionLength: updated.systemInstruction?.length || 0,
      summaryInstructionLength: updated.summaryInstruction?.length || 0,
      model: updated.model,
      updatedAt: updated.updatedAt,
    }, 'Agent updated via Prisma');

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
      logger.error({ agentId, userId }, 'CRITICAL: Agent not found after update');
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
      logger.error({
        agentId,
        userId,
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
      }, 'CRITICAL: Data mismatch after update verification');
      return res.status(500).json({ 
        error: 'Agent update verification failed - data mismatch' 
      });
    }

    logger.debug({
      agentId: verify.id,
      name: verify.name,
      role: verify.role || '(нет роли)',
      systemInstructionLength: verify.systemInstruction?.length || 0,
      summaryInstructionLength: verify.summaryInstruction?.length || 0,
      model: verify.model,
      updatedAt: verify.updatedAt,
    }, 'Update verification successful');

    res.json({ agent: updated });
  } catch (error) {
    logger.error({
      agentId,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Error updating agent');
    return res.status(500).json({ 
      error: 'Failed to update agent',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.delete('/:agentId', async (req, res) => {
  const userId = req.userId!;
  const { agentId } = req.params;

  logger.debug({ agentId, userId }, 'Attempting to delete agent');

  try {
    // Проверяем, существует ли агент с таким ID у пользователя
    const existing = await prisma.agent.findFirst({ 
      where: { id: agentId, userId },
      include: { user: { select: { id: true, username: true } } }
    });

    logger.debug({
      found: !!existing,
      agentId: existing?.id,
      name: existing?.name,
      userId: existing?.userId,
    }, 'Agent search result');

    if (!existing) {
      // Проверяем, может быть агент существует, но принадлежит другому пользователю
      const agentExists = await prisma.agent.findFirst({ where: { id: agentId } });
      if (agentExists) {
        logger.warn({
          agentId,
          agentUserId: agentExists.userId,
          currentUserId: userId,
        }, 'Agent found but belongs to different user');
        return res.status(403).json({ error: 'Access denied. Agent belongs to different user.' });
      }
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Запрещаем удаление агентов с ролью
    if (existing.role && existing.role.trim() !== '') {
      logger.warn({ agentId, role: existing.role }, 'Attempt to delete agent with assigned role');
      return res.status(400).json({ error: 'Cannot delete agent with assigned role' });
    }

    // Удаляем агента - каскадное удаление автоматически удалит связанные messages и files
    // благодаря onDelete: Cascade в схеме Prisma и включенным foreign keys в SQLite
    // Foreign keys включены при инициализации Prisma Client в db/prisma.ts
    await prisma.agent.delete({ where: { id: agentId } });
    logger.info({ agentId, name: existing.name }, 'Agent successfully deleted');
    
    res.status(204).send();
  } catch (error) {
    logger.error({
      agentId,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Error deleting agent');
    
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

  // Параметры пагинации
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 50));
  const skip = (page - 1) * limit;

  const agent = await prisma.agent.findFirst({
    where: { id: agentId, userId },
  });
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  // Получаем сообщения с пагинацией
  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where: { agentId },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
    }),
    prisma.message.count({
      where: { agentId },
    }),
  ]);

  res.json({
    messages,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + limit < total,
    },
  });
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
  logger.debug({
    agentId: agent.id,
    agentName: agent.name,
    agentFilesCount: agent.files.length,
    projectFilesCount: allProjectFiles.length,
    totalFilesCount: allFiles.length,
    projectFileNames: allProjectFiles.map(f => f.name),
    fileAgentIds: allProjectFiles.map(f => ({ name: f.name, agentId: f.agentId })),
  }, 'Processing message with files');

  // Создаем объект агента со всеми файлами проекта
  const agentWithAllFiles = {
    ...agent,
    files: allFiles,
  };

  // Загружаем последние 100 сообщений для контекста (можно увеличить при необходимости)
  const history = await prisma.message.findMany({
    where: { agentId },
    orderBy: { createdAt: 'asc' },
    take: 100,
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
    logger.error({
      agentId,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
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

const FILE_SIZE_LIMIT = 2 * 1024 * 1024; // 2MB

const fileSchema = z.object({
  name: z.string().min(1),
  mimeType: z.string().min(1),
  content: z.string().min(1),
  isKnowledgeBase: z.boolean().optional().default(false),
});

// Функция для вычисления размера base64 строки в байтах
function getBase64Size(base64String: string): number {
  // Base64 добавляет ~33% к размеру, поэтому декодируем для точного размера
  try {
    const buffer = Buffer.from(base64String, 'base64');
    return buffer.length;
  } catch {
    // Если не удалось декодировать, используем приблизительный расчет
    return Math.ceil(base64String.length * 0.75);
  }
}

router.post('/:agentId/files', async (req, res) => {
  const userId = req.userId!;
  const { agentId } = req.params;
  const parsed = fileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  // Валидация размера файла на бэкенде
  const fileSize = getBase64Size(parsed.data.content);
  if (fileSize > FILE_SIZE_LIMIT) {
    return res.status(400).json({ 
      error: `File size exceeds limit of ${FILE_SIZE_LIMIT / (1024 * 1024)}MB. Actual size: ${(fileSize / (1024 * 1024)).toFixed(2)}MB` 
    });
  }

  const agent = await prisma.agent.findFirst({ where: { id: agentId, userId } });
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  logger.debug({
    agentId,
    agentName: agent.name,
    userId,
    fileName: parsed.data.name,
    mimeType: parsed.data.mimeType,
    contentLength: parsed.data.content.length,
    isKnowledgeBase: parsed.data.isKnowledgeBase,
  }, 'Creating file');

  const file = await prisma.file.create({
    data: {
      agentId,
      name: parsed.data.name,
      mimeType: parsed.data.mimeType,
      content: parsed.data.content,
      isKnowledgeBase: parsed.data.isKnowledgeBase ?? false,
    },
  });

  logger.info({
    fileId: file.id,
    fileName: file.name,
    agentId: file.agentId,
    createdAt: file.createdAt,
  }, 'File created successfully');

  // Проверяем общее количество файлов для этого пользователя
  const totalFiles = await prisma.file.count({
    where: {
      agent: { userId }
    }
  });
  logger.debug({ userId, totalFiles }, 'Total files for user');

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
  logger.debug({
    agentId,
    projectFilesCount: projectFiles.length,
    projectFileNames: projectFiles.map(f => f.name),
  }, 'Summary files loaded');

  res.json({ files: projectFiles });
});

// ВАЖНО: Этот маршрут должен быть ВЫШЕ /:agentId/files/:fileId
// чтобы Express не интерпретировал '/files' как ':agentId'
router.delete('/files/:fileId', async (req, res) => {
  const userId = req.userId!;
  const { fileId } = req.params;

  logger.debug({ fileId, userId }, 'Attempting to delete file');

  const file = await prisma.file.findFirst({
    where: { id: fileId },
    include: { agent: true },
  });

  if (!file) {
    logger.warn({ fileId }, 'File not found for deletion');
    return res.status(404).json({ error: 'File not found' });
  }

  if (file.agent.userId !== userId) {
    logger.warn({ fileId, fileUserId: file.agent.userId, currentUserId: userId }, 'Access denied: file belongs to different user');
    return res.status(403).json({ error: 'Access denied. File belongs to different user.' });
  }

  await prisma.file.delete({ where: { id: fileId } });
  logger.info({ fileId, fileName: file.name }, 'File deleted successfully');

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
    logger.debug({
      agentId,
      agentName: agent.name,
      userId,
      messagesCount: messages.length,
    }, 'Generating summary');

    const summaryText = await generateSummaryContent(agent, transcript);
    logger.debug({ agentId, summaryLength: summaryText.length }, 'Summary generated');

    const fileName = `Summary - ${agent.name} - ${new Date().toLocaleString()}`;
    logger.debug({ agentId, fileName }, 'Creating summary file');

    const file = await prisma.file.create({
      data: {
        agentId,
        name: fileName,
        mimeType: 'text/markdown',
        content: Buffer.from(summaryText, 'utf-8').toString('base64'),
        isKnowledgeBase: false,  // Summary файлы - это документы проекта, не база знаний
      },
    });

    logger.info({
      fileId: file.id,
      fileName: file.name,
      agentId: file.agentId,
      createdAt: file.createdAt,
    }, 'Summary file created successfully');

    // Проверяем общее количество файлов для этого пользователя
    const totalFiles = await prisma.file.count({
      where: {
        agent: { userId }
      }
    });
    logger.debug({ userId, totalFiles }, 'Total files for user');

    res.status(201).json({ file });
  } catch (error) {
    logger.error({
      agentId,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Summary generation failed');
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

router.post('/:agentId/files/:fileId/generate-result', async (req, res) => {
  const userId = req.userId!;
  const { agentId, fileId } = req.params;
  const parsed = z.object({
    role: z.enum(['dsl', 'verstka']),
  }).safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const { role } = parsed.data;

  // Helper function to check if agent has role
  const hasRoleInDB = (agentRole: string | null | undefined, roleName: string): boolean => {
    if (!agentRole) return false;
    const roles = agentRole.split(',').map(r => r.trim());
    return roles.includes(roleName);
  };

  // Находим агента, который будет генерировать результат (DSL или Верстка)
  // Ищем агента, у которого есть нужная роль (может быть частью множественных ролей)
  const allAgents = await prisma.agent.findMany({
    where: { userId },
    include: { files: true },
  });

  const targetAgent = allAgents.find(agent => 
    hasRoleInDB(agent.role, role === 'dsl' ? 'dsl' : 'verstka')
  );

  if (!targetAgent) {
    return res.status(404).json({ error: `${role === 'dsl' ? 'DSL' : 'Verstka'} agent not found` });
  }

  // Находим исходный документ
  const sourceFile = await prisma.file.findFirst({
    where: {
      id: fileId,
      agent: { userId },
    },
  });

  if (!sourceFile) {
    return res.status(404).json({ error: 'File not found' });
  }

  // Проверяем, что документ создан агентом-копирайтером
  const sourceAgent = await prisma.agent.findFirst({
    where: { id: sourceFile.agentId, userId },
  });

  // Helper function to check if agent has role
  const hasRole = (agentRole: string | null | undefined, roleName: string): boolean => {
    if (!agentRole) return false;
    const roles = agentRole.split(',').map(r => r.trim());
    return roles.includes(roleName);
  };

  if (!sourceAgent || !hasRole(sourceAgent.role, 'copywriter')) {
    return res.status(400).json({ error: 'File must be created by copywriter agent' });
  }

  try {
    // Декодируем контент документа
    const documentContent = Buffer.from(sourceFile.content, 'base64').toString('utf-8');

    logger.debug({
      agentId: targetAgent.id,
      agentName: targetAgent.name,
      fileId: sourceFile.id,
      fileName: sourceFile.name,
      role,
      contentLength: documentContent.length,
    }, 'Generating document result');

    // Генерируем результат
    const resultText = await generateDocumentResult(
      {
        id: targetAgent.id,
        name: targetAgent.name,
        systemInstruction: targetAgent.systemInstruction,
        summaryInstruction: targetAgent.summaryInstruction,
        model: targetAgent.model,
        files: targetAgent.files,
      },
      documentContent,
      role,
    );

    logger.debug({
      agentId: targetAgent.id,
      fileId: sourceFile.id,
      role,
      resultLength: resultText.length,
    }, 'Document result generated');

    // Обновляем исходный файл, добавляя результат в соответствующее поле
    const resultBase64 = Buffer.from(resultText, 'utf-8').toString('base64');
    
    const updateData = role === 'dsl' 
      ? { dslContent: resultBase64 } as any
      : { verstkaContent: resultBase64 } as any;
    
    const updatedFile = await prisma.file.update({
      where: { id: fileId },
      data: updateData,
    });

    logger.info({
      fileId: updatedFile.id,
      role,
      resultLength: resultText.length,
    }, 'Document result saved successfully');

    res.json({ file: updatedFile });
  } catch (error) {
    logger.error({
      agentId: targetAgent.id,
      fileId,
      role,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Document result generation failed');
    res.status(500).json({ error: 'Failed to generate document result' });
  }
});

export default router;

