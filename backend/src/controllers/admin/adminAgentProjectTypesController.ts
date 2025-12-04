import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';
import { getProjectTypes, attachToProjectTypes, detachFromProjectType } from '../../services/admin/adminAgentProjectTypeService';
import { validateProjectTypeIds, formatValidationErrors } from '../../utils/admin/validation';
import { getAgentTemplate } from '../../services/admin/adminAgentService';

/**
 * Получить типы проектов, к которым привязан агент
 */
export const getProjectTypesHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const agent = await getAgentTemplate(id);
    if (!agent) {
      return res.status(404).json({ error: 'Агент не найден' });
    }

    const projectTypes = await getProjectTypes(id);
    res.json({ projectTypes });
  } catch (error: any) {
    if (error.message === 'Агент не найден') {
      return res.status(404).json({ error: error.message });
    }
    logger.error({ error: error.message, stack: error.stack }, 'GET /admin/agents/:id/project-types error');
    next(error);
  }
};

/**
 * Привязать агента к типам проектов
 */
export const attachToProjectTypesHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const parsed = validateProjectTypeIds(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: `Validation error: ${formatValidationErrors(parsed.error)}` 
      });
    }

    const { projectTypeIds } = parsed.data;

    const agent = await getAgentTemplate(id);
    if (!agent) {
      return res.status(404).json({ error: 'Агент не найден' });
    }

    await attachToProjectTypes(id, projectTypeIds);
    res.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Агент не найден' || error.message === 'Один или несколько типов проектов не найдены') {
      return res.status(404).json({ error: error.message });
    }
    logger.error({ error: error.message, stack: error.stack }, 'POST /admin/agents/:id/project-types error');
    next(error);
  }
};

/**
 * Отвязать агента от типа проекта
 */
export const detachFromProjectTypeHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id, projectTypeId } = req.params;

    const agent = await getAgentTemplate(id);
    if (!agent) {
      return res.status(404).json({ error: 'Агент не найден' });
    }

    await detachFromProjectType(id, projectTypeId);
    res.status(204).send();
  } catch (error: any) {
    if (error.message === 'Агент не найден') {
      return res.status(404).json({ error: error.message });
    }
    logger.error({ error: error.message, stack: error.stack }, 'DELETE /admin/agents/:id/project-types/:projectTypeId error');
    next(error);
  }
};

