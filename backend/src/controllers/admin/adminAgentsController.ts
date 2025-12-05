import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';
import { env } from '../../env';
import { 
  getAllAgentTemplates, 
  getAgentTemplateWithProjectTypes, 
  getAgentTemplate,
  createAgentTemplate, 
  updateAgentTemplate, 
  deleteAgentTemplate 
} from '../../services/admin/adminAgentService';
import { validateAgentTemplate, formatValidationErrors, agentTemplateSchema } from '../../utils/admin/validation';
import { handleTableNotFoundError, handleValidationError } from '../../utils/admin/errorHandlers';

/**
 * Получить всех агентов-шаблонов
 */
export const getAllAgents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const agents = await getAllAgentTemplates();
    logger.debug({ agentsCount: agents.length }, 'Admin agents fetched');
    res.json({ agents });
  } catch (error: any) {
    logger.error({ 
      error: error.message, 
      stack: error.stack, 
      code: error.code, 
      meta: error.meta,
      name: error.name,
      cause: error.cause
    }, 'GET /admin/agents error');
    
    if (error?.code === 'P2021' || 
        error?.message?.includes('does not exist') || 
        error?.message?.includes('relation') ||
        error?.message?.includes('column')) {
      return handleTableNotFoundError(error, res, 'GET /admin/agents');
    }
    
    next(error);
  }
};

/**
 * Получить конкретный агент-шаблон
 */
export const getAgent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const agent = await getAgentTemplateWithProjectTypes(id);

    if (!agent) {
      return res.status(404).json({ error: 'Агент не найден' });
    }

    res.json({ agent });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'GET /admin/agents/:id error');
    next(error);
  }
};

/**
 * Создать новый агент-шаблон
 */
export const createAgent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = validateAgentTemplate(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: `Validation error: ${formatValidationErrors(parsed.error)}` 
      });
    }

    const { name, description, systemInstruction, summaryInstruction, model, role, isHiddenFromSidebar, quickMessages } = parsed.data;

    let agent: any;
    try {
      agent = await createAgentTemplate({
        name,
        description,
        systemInstruction,
        summaryInstruction,
        model,
        role,
        isHiddenFromSidebar,
        quickMessages,
      });
    } catch (error: any) {
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
      throw error;
    }

    logger.info({ agentId: (agent as any).id, name }, 'Admin agent created');
    res.status(201).json({ agent });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack, code: error.code, meta: error.meta }, 'POST /admin/agents error');
    next(error);
  }
};

/**
 * Обновить агент-шаблон
 */
export const updateAgent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const parsed = agentTemplateSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ 
        error: `Validation error: ${formatValidationErrors(parsed.error)}` 
      });
    }

    const existing = await getAgentTemplate(id);
    if (!existing) {
      return res.status(404).json({ error: 'Агент не найден' });
    }

    const updated = await updateAgentTemplate(id, parsed.data);

    logger.info({ agentId: id }, 'Admin agent updated');
    res.json({ agent: updated });
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'PUT /admin/agents/:id error');
    next(error);
  }
};

/**
 * Удалить агент-шаблон
 */
export const deleteAgent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existing = await getAgentTemplate(id);
    if (!existing) {
      return res.status(404).json({ error: 'Агент не найден' });
    }

    await deleteAgentTemplate(id);
    res.status(204).send();
  } catch (error: any) {
    logger.error({ error: error.message, stack: error.stack }, 'DELETE /admin/agents/:id error');
    next(error);
  }
};

