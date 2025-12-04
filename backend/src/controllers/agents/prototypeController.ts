import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../db/prisma';
import { withRetry } from '../../utils/prismaRetry';
import { logger } from '../../utils/logger';
import { findDSLAgent, findVerstkaAgent, generateDSL, generateHTML, getNextPrototypeVersion, limitPrototypeVersions } from '../../services/agents/prototypeService';
import { decodeBase64ToText } from '../../services/openaiService';
import { AuthenticatedRequest } from '../../types/express';

const MAX_VERSIONS = 10;

/**
 * Сгенерировать прототип из файла
 */
export const generatePrototype = async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest;
  const { agentId, fileId } = authReq.params;
  const userId = authReq.userId!;

  logger.info({ agentId, fileId, userId }, 'POST /agents/:agentId/files/:fileId/generate-prototype - request received');

  try {
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

    const projectId = file.agent?.projectId;
    if (!projectId) {
      return res.status(400).json({ error: 'File is not associated with a project' });
    }

    const project = await withRetry(
      () => prisma.project.findFirst({
        where: { id: projectId },
        include: { projectType: true },
      }),
      3,
      `POST /agents/${agentId}/files/${fileId}/generate-prototype - find project`
    );

    const projectAgents = await withRetry(
      () => prisma.agent.findMany({
        where: { projectId }
      }),
      3,
      `POST /agents/${agentId}/files/${fileId}/generate-prototype - find project agents`
    );

    const dslAgent = findDSLAgent(projectAgents);
    const verstkaAgent = findVerstkaAgent(projectAgents);

    if (!dslAgent) {
      return res.status(400).json({ error: 'DSL agent not found in project' });
    }
    if (!verstkaAgent) {
      return res.status(400).json({ error: 'Verstka agent not found in project' });
    }

    const projectInfo = project ? {
      name: project.name || null,
      description: project.description || null,
      projectTypeName: project.projectType?.name || null,
    } : undefined;

    // Генерируем DSL
    const fileContent = decodeBase64ToText(file.content);
    const dslContent = await generateDSL(dslAgent, fileContent, projectInfo);

    // Генерируем HTML
    const verstkaContent = await generateHTML(verstkaAgent, dslContent, projectInfo);

    // Получаем следующий номер версии
    const nextVersionNumber = await getNextPrototypeVersion(fileId);

    // Создаем новую версию прототипа
    const newVersion = await withRetry(
      async () => {
        const version = await prisma.prototypeVersion.create({
          data: {
            fileId,
            versionNumber: nextVersionNumber,
            dslContent,
            verstkaContent
          }
        });

        // Ограничиваем количество версий
        await limitPrototypeVersions(fileId, MAX_VERSIONS);

        return version;
      },
      3,
      `POST /agents/${agentId}/files/${fileId}/generate-prototype - create version`
    );

    // Обновляем файл с последней версией для обратной совместимости
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

    logger.info({ 
      fileId, 
      versionNumber: nextVersionNumber,
      hasDsl: !!dslContent, 
      hasVerstka: !!verstkaContent 
    }, 'Prototype version created and saved');

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
};

/**
 * Получить все версии прототипа
 */
export const getPrototypeVersions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { fileId } = authReq.params;
    const userId = authReq.userId;

    logger.info({ fileId, userId }, 'GET /agents/files/:fileId/prototype-versions');

    const file = await withRetry(
      () => prisma.file.findFirst({
        where: {
          id: fileId,
          agent: {
            userId
          }
        },
        select: { id: true }
      }),
      3,
      `GET /agents/files/${fileId}/prototype-versions - verify file`
    );

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const versions = await withRetry(
      () => prisma.prototypeVersion.findMany({
        where: { fileId },
        orderBy: { versionNumber: 'desc' },
        select: {
          id: true,
          versionNumber: true,
          createdAt: true,
          dslContent: true,
          verstkaContent: true
        }
      }),
      3,
      `GET /agents/files/${fileId}/prototype-versions - find versions`
    );

    logger.info({ fileId, versionsCount: versions.length }, 'Prototype versions retrieved');

    res.json({ versions });
  } catch (error) {
    const authReq = req as AuthenticatedRequest;
    logger.error({
      fileId: authReq.params.fileId,
      userId: authReq.userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, 'Failed to get prototype versions');
    res.status(500).json({ error: 'Failed to get prototype versions' });
  }
};

/**
 * Удалить версию прототипа
 */
export const deletePrototypeVersion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const { fileId, versionNumber } = authReq.params;
    const userId = authReq.userId;
    const versionNum = parseInt(versionNumber, 10);

    if (isNaN(versionNum)) {
      return res.status(400).json({ error: 'Invalid version number' });
    }

    logger.info({ fileId, versionNumber: versionNum, userId }, 'DELETE /agents/files/:fileId/prototype-versions/:versionNumber');

    const file = await withRetry(
      () => prisma.file.findFirst({
        where: {
          id: fileId,
          agent: {
            userId
          }
        },
        select: { id: true }
      }),
      3,
      `DELETE /agents/files/${fileId}/prototype-versions/${versionNumber} - verify file`
    );

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const version = await withRetry(
      () => prisma.prototypeVersion.findUnique({
        where: {
          fileId_versionNumber: {
            fileId,
            versionNumber: versionNum
          }
        },
        select: { id: true }
      }),
      3,
      `DELETE /agents/files/${fileId}/prototype-versions/${versionNumber} - verify version`
    );

    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }

    await withRetry(
      () => prisma.prototypeVersion.delete({
        where: {
          fileId_versionNumber: {
            fileId,
            versionNumber: versionNum
          }
        }
      }),
      3,
      `DELETE /agents/files/${fileId}/prototype-versions/${versionNumber} - delete version`
    );

    // Если удаленная версия была последней, обновляем файл с новой последней версией
    const latestVersion = await withRetry(
      () => prisma.prototypeVersion.findFirst({
        where: { fileId },
        orderBy: { versionNumber: 'desc' },
        select: {
          dslContent: true,
          verstkaContent: true
        }
      }),
      3,
      `DELETE /agents/files/${fileId}/prototype-versions/${versionNumber} - find latest version`
    );

    if (latestVersion) {
      await withRetry(
        () => prisma.file.update({
          where: { id: fileId },
          data: {
            dslContent: latestVersion.dslContent,
            verstkaContent: latestVersion.verstkaContent
          }
        }),
        3,
        `DELETE /agents/files/${fileId}/prototype-versions/${versionNumber} - update file`
      );
    } else {
      await withRetry(
        () => prisma.file.update({
          where: { id: fileId },
          data: {
            dslContent: null,
            verstkaContent: null
          }
        }),
        3,
        `DELETE /agents/files/${fileId}/prototype-versions/${versionNumber} - clear file`
      );
    }

    logger.info({ fileId, versionNumber: versionNum }, 'Prototype version deleted');

    res.json({ success: true });
  } catch (error) {
    const authReq = req as AuthenticatedRequest;
    logger.error({
      fileId: authReq.params.fileId,
      versionNumber: authReq.params.versionNumber,
      userId: authReq.userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, 'Failed to delete prototype version');
    res.status(500).json({ error: 'Failed to delete prototype version' });
  }
};

