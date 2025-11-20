import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { generateAgentResponse, generateSummaryContent } from '../services/openaiService';
import { DEFAULT_AGENTS } from '../constants/defaultAgents';

const router = Router();

const agentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  systemInstruction: z.string().optional(),
  summaryInstruction: z.string().optional(),
  model: z.string().optional(),
  role: z.string().optional(),
});

router.get('/', async (req, res) => {
  const userId = req.userId!;
  let agents = await prisma.agent.findMany({
    where: { userId },
    include: {
      files: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Проверяем и создаем недостающих агентов с ролями для существующих пользователей
  const agentsByRole = new Map(agents.map(agent => [agent.role || '', agent]));
  const requiredRoles = ['copywriter', 'dsl', 'verstka'];
  const agentsToCreate = [];

  for (const role of requiredRoles) {
    if (!agentsByRole.has(role)) {
      const defaultAgent = DEFAULT_AGENTS.find(agent => agent.role === role);
      if (defaultAgent) {
        agentsToCreate.push({
          userId,
          name: defaultAgent.name,
          description: defaultAgent.description,
          systemInstruction: defaultAgent.systemInstruction,
          summaryInstruction: defaultAgent.summaryInstruction,
          model: defaultAgent.model,
          role: defaultAgent.role || '',
        });
      }
    }
  }

  if (agentsToCreate.length > 0) {
    const created = await prisma.agent.createMany({
      data: agentsToCreate,
    });
    
    // Получаем обновленный список агентов
    agents = await prisma.agent.findMany({
      where: { userId },
      include: {
        files: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  res.json({ agents });
});

router.post('/', async (req, res) => {
  const userId = req.userId!;
  const parsed = agentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const agent = await prisma.agent.create({
    data: {
      userId,
      name: parsed.data.name,
      description: parsed.data.description ?? '',
      systemInstruction: parsed.data.systemInstruction ?? '',
      summaryInstruction: parsed.data.summaryInstruction ?? '',
      model: parsed.data.model ?? 'gpt-5.1',
      role: parsed.data.role ?? '',
    },
  });

  res.status(201).json({ agent });
});

router.put('/:agentId', async (req, res) => {
  const userId = req.userId!;
  const { agentId } = req.params;
  const parsed = agentSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const existing = await prisma.agent.findFirst({ where: { id: agentId, userId } });
  if (!existing) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  const updated = await prisma.agent.update({
    where: { id: agentId },
    data: parsed.data,
  });

  res.json({ agent: updated });
});

router.delete('/:agentId', async (req, res) => {
  const userId = req.userId!;
  const { agentId } = req.params;

  const existing = await prisma.agent.findFirst({ where: { id: agentId, userId } });
  if (!existing) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  // Запрещаем удаление агентов с ролью
  if (existing.role && existing.role.trim() !== '') {
    return res.status(400).json({ error: 'Cannot delete agent with assigned role' });
  }

  await prisma.agent.delete({ where: { id: agentId } });
  res.status(204).send();
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
      agent,
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

  const file = await prisma.file.create({
    data: {
      agentId,
      name: parsed.data.name,
      mimeType: parsed.data.mimeType,
      content: parsed.data.content,
    },
  });

  res.status(201).json({ file });
});

router.delete('/:agentId/files/:fileId', async (req, res) => {
  const userId = req.userId!;
  const { agentId, fileId } = req.params;

  const file = await prisma.file.findFirst({
    where: { id: fileId, agentId, agent: { userId } },
  });

  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }

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
    const summaryText = await generateSummaryContent(agent, transcript);
    const file = await prisma.file.create({
      data: {
        agentId,
        name: `Summary - ${agent.name} - ${new Date().toLocaleString()}`,
        mimeType: 'text/markdown',
        content: Buffer.from(summaryText, 'utf-8').toString('base64'),
      },
    });

    res.status(201).json({ file });
  } catch (error) {
    console.error('Summary generation failed', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

export default router;

