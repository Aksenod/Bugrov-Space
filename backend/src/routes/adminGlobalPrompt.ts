import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler';
import { getGlobalPromptRecord, updateGlobalPrompt } from '../services/globalPromptService';
import { logger } from '../utils/logger';

const router = Router();

const updateSchema = z.object({
  content: z.string().max(5000, 'Максимальный размер глобального промта — 5000 символов'),
});

router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const record = await getGlobalPromptRecord();
    return res.json({
      globalPrompt: {
        content: record.content ?? '',
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      },
    });
  }),
);

router.put(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      logger.warn(
        { issues: parsed.error.issues },
        'Validation error while updating global prompt',
      );
      return res.status(400).json({
        error: 'Validation error',
        details: parsed.error.flatten(),
      });
    }

    const record = await updateGlobalPrompt(parsed.data.content);
    return res.json({
      globalPrompt: {
        content: record.content ?? '',
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      },
    });
  }),
);

export default router;

