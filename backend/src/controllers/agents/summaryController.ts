import { Request, Response } from 'express';
import { prisma } from '../../db/prisma';
import { withRetry } from '../../utils/prismaRetry';
import { logger } from '../../utils/logger';
import { getOrCreateAgentFromTemplate } from '../../services/agents/agentTemplateService';
import { generateSummaryContent } from '../../services/openaiService';
import { loadMessages } from '../../services/agents/messageService';
import { AuthenticatedRequest } from '../../types/express';

/**
 * Сгенерировать саммари разговора с агентом
 */
export const generateSummary = async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.userId!;
  const { agentId } = authReq.params;
  const projectId = authReq.query.projectId as string | undefined;

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

  const agent = await getOrCreateAgentFromTemplate(agentId, userId, projectId);

  if (!agent) {
    logger.warn({ agentId, userId, projectId }, 'Agent not found and not a ProjectTypeAgent');
    return res.status(404).json({ error: 'Agent not found' });
  }

  const actualAgentId = agent.id;

  const messages = await loadMessages(actualAgentId);

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
          agentId: actualAgentId,
          name: fileName,
          mimeType: 'text/markdown',
          content: Buffer.from(summaryText, 'utf-8').toString('base64'),
          isKnowledgeBase: false,
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
};

