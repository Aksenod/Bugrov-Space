import { Router } from 'express';
import { getAllAgents, getAgent, createAgent, updateAgent, deleteAgent } from '../../../controllers/admin/adminAgentsController';
import { asyncHandler } from '../../../middleware/errorHandler';

const router = Router();

// GET / - получить все агенты-шаблоны
router.get('/', asyncHandler(getAllAgents));

// GET /:id - получить конкретный агент-шаблон
router.get('/:id', asyncHandler(getAgent));

// POST / - создать новый агент-шаблон
router.post('/', asyncHandler(createAgent));

// PUT /:id - обновить агент-шаблон
router.put('/:id', asyncHandler(updateAgent));

// DELETE /:id - удалить агент-шаблон
router.delete('/:id', asyncHandler(deleteAgent));

export default router;

