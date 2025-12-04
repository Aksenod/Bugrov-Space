import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../db/prisma';
import { withRetry } from '../../utils/prismaRetry';
import { logger } from '../../utils/logger';
import { getOrCreateAgentFromTemplate } from '../../services/agents/agentTemplateService';
import { loadAgentFiles, loadTemplateFiles, loadSummaryFiles } from '../../services/agents/fileService';
import { AuthenticatedRequest } from '../../types/express';

/**
 * Получить файлы базы знаний агента
 */
export const getAgentFiles = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthenticatedRequest;
  const { agentId } = authReq.params;
  try {
    const userId = authReq.userId!;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let agent = await withRetry(
      () => prisma.agent.findFirst({
        where: { id: agentId, userId },
      }),
      3,
      `GET /agents/${agentId}/files - find agent`
    );

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
          const files = await loadTemplateFiles(agentId);
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

    const files = await loadAgentFiles(agentId);

    res.json({ files });
  } catch (error: any) {
    logger.error({ agentId, error: error.message, stack: error.stack }, 'GET /agents/:agentId/files error');
    next(error);
  }
};

/**
 * Получить файлы для генерации саммари (документы проекта)
 */
export const getSummaryFiles = async (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthenticatedRequest;
  const { agentId } = authReq.params;
  const projectId = authReq.query.projectId as string | undefined;
  try {
    const userId = authReq.userId!;

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

    const agent = await getOrCreateAgentFromTemplate(agentId, userId, projectId);

    if (!agent) {
      logger.warn({ agentId, userId, projectId }, 'Agent not found and not a ProjectTypeAgent');
      return res.status(404).json({ error: 'Agent not found' });
    }

    const projectAgents = await withRetry(
      () => prisma.agent.findMany({
        where: { projectId: projectId, userId },
        select: { id: true },
      }),
      3,
      `GET /agents/${agentId}/files/summary - find project agents`
    );

    let agentIds = projectAgents.map(a => a.id);
    if (!agentIds.includes(agent.id)) {
      agentIds = [...agentIds, agent.id];
    }

    const projectFiles = await loadSummaryFiles(agentIds);

    logger.debug({ agentId, projectId, filesCount: projectFiles.length }, 'Summary files loaded');

    res.json({ files: projectFiles });
  } catch (error: any) {
    logger.error({ agentId, projectId, error: error.message, stack: error.stack }, 'GET /agents/:agentId/files/summary error');
    next(error);
  }
};

/**
 * Удалить файл
 */
export const deleteFile = async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.userId!;
  const { fileId } = authReq.params;

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
};

/**
 * Обновить содержимое файла
 */
export const updateFile = async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { fileId } = authReq.params;
  const userId = authReq.userId!;
  const { content } = authReq.body;

  logger.info({ fileId, userId }, 'PATCH /agents/files/:fileId - request received');

  if (!content || typeof content !== 'string') {
    return res.status(400).json({ error: 'Content is required and must be a string' });
  }

  try {
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

    if (!file.agent || file.agent.userId !== userId) {
      if (!file.agent) {
        logger.warn({ fileId, userId }, 'File does not belong to an agent');
      } else {
        logger.warn({ fileId, fileUserId: file.agent.userId, currentUserId: userId }, 'Attempt to update file belonging to different user');
      }
      return res.status(403).json({ error: 'Access denied. File belongs to different user.' });
    }

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
};

