import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';
import { uploadAgentFile, getAgentFiles, deleteAgentFile } from '../../services/admin/adminAgentFileService';
import { validateFile, formatValidationErrors } from '../../utils/admin/validation';
import { getAgentTemplate } from '../../services/admin/adminAgentService';
import { handleColumnNotFoundError } from '../../utils/admin/errorHandlers';

/**
 * Получить файлы агента-шаблона
 */
export const getAgentFilesHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const agent = await getAgentTemplate(id);
    if (!agent) {
      return res.status(404).json({ error: 'Агент не найден' });
    }

    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const files = await getAgentFiles(id);

    res.json({ 
      files: files.map((file) => ({
        id: file.id,
        agentId: file.projectTypeAgentId || file.agentId,
        name: file.name,
        mimeType: file.mimeType,
        content: file.content,
        isKnowledgeBase: file.isKnowledgeBase,
        createdAt: file.createdAt,
      }))
    });
  } catch (error: any) {
    if (error.message?.includes('Unknown field') || error.message?.includes('projectTypeAgentId') || error.code === 'P2021') {
      logger.error({ 
        agentId: req.params.id,
        error: error.message, 
        name: error.name,
        code: error.code,
        meta: error.meta,
        stack: error.stack 
      }, 'GET /admin/agents/:id/files error - field projectTypeAgentId does not exist in database schema');
      return res.json({ files: [] });
    }

    logger.error({ 
      agentId: req.params.id,
      error: error.message, 
      name: error.name,
      code: error.code,
      meta: error.meta,
      stack: error.stack 
    }, 'GET /admin/agents/:id/files error');
    next(error);
  }
};

/**
 * Загрузить файл для агента-шаблона
 */
export const uploadAgentFileHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const parsed = validateFile(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({ 
        error: `Validation error: ${formatValidationErrors(parsed.error)}` 
      });
    }

    const agent = await getAgentTemplate(id);
    if (!agent) {
      return res.status(404).json({ error: 'Агент не найден' });
    }

    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const file = await uploadAgentFile(id, parsed.data);
      
      res.status(201).json({ 
        file: {
          id: file.id,
          agentId: file.projectTypeAgentId || file.agentId,
          name: file.name,
          mimeType: file.mimeType,
          content: file.content,
          isKnowledgeBase: file.isKnowledgeBase,
          createdAt: file.createdAt,
        }
      });
    } catch (error: any) {
      const errorDetails: any = {
        agentId: id,
        fileName: parsed.data.name,
        errorMessage: error.message,
        errorName: error.name,
        errorCode: error.code,
        errorMeta: error.meta,
        stack: error.stack,
      };

      if (error.message?.includes('Unknown field') || error.message?.includes('projectTypeAgentId')) {
        logger.error(errorDetails, 'POST /admin/agents/:id/files error - field projectTypeAgentId may not exist in database schema');
        return handleColumnNotFoundError(error, res, 'POST /admin/agents/:id/files', 'projectTypeAgentId');
      }

      if (error.code === 'P2003') {
        logger.error(errorDetails, 'POST /admin/agents/:id/files error - foreign key constraint violation');
        return res.status(400).json({ 
          error: 'Ошибка: агент-шаблон не найден или некорректный ID.' 
        });
      }

      if (error.code) {
        logger.error(errorDetails, 'POST /admin/agents/:id/files error - Prisma error');
        return res.status(500).json({ 
          error: `Ошибка базы данных: ${error.message || 'Неизвестная ошибка'}. Код ошибки: ${error.code}` 
        });
      }

      logger.error(errorDetails, 'POST /admin/agents/:id/files error - unknown error');
      throw error;
    }
  } catch (error: any) {
    next(error);
  }
};

/**
 * Удалить файл агента-шаблона
 */
export const deleteAgentFileHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, fileId } = req.params;

    const agent = await getAgentTemplate(id);
    if (!agent) {
      return res.status(404).json({ error: 'Агент не найден' });
    }

    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await deleteAgentFile(id, fileId);
    res.status(204).send();
  } catch (error: any) {
    if (error.message === 'Файл не найден') {
      return res.status(404).json({ error: error.message });
    }
    logger.error({ agentId: req.params.id, fileId: req.params.fileId, error: error.message, stack: error.stack }, 'DELETE /admin/agents/:id/files/:fileId error');
    next(error);
  }
};

