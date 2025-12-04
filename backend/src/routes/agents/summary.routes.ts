import { Router } from 'express';
import { generateSummary } from '../../controllers/agents/summaryController';
import { asyncHandler } from '../../middleware/errorHandler';

const router = Router();

// POST /:agentId/summary - сгенерировать саммари разговора
router.post('/:agentId/summary', asyncHandler(generateSummary));

export default router;

