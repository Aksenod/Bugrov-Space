import { Router } from 'express';
import { getAgents, forbidAgentMutation } from '../../controllers/agents/agentsController';
import { asyncHandler } from '../../middleware/errorHandler';

const router = Router();

// GET / - получить список агентов проекта
router.get('/', asyncHandler(getAgents));

// POST / - создать агента (запрещено для обычных пользователей)
router.post('/', forbidAgentMutation);

// POST /reorder - изменить порядок агентов (запрещено)
router.post('/reorder', forbidAgentMutation);

// PUT /:agentId - обновить агента (запрещено)
router.put('/:agentId', forbidAgentMutation);

// DELETE /:agentId - удалить агента (запрещено)
router.delete('/:agentId', forbidAgentMutation);

export default router;

