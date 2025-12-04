import { Router } from 'express';
import { getMessages, postMessage, deleteMessages } from '../../controllers/agents/messagesController';
import { asyncHandler } from '../../middleware/errorHandler';

const router = Router();

// GET /:agentId/messages - получить сообщения агента
router.get('/:agentId/messages', asyncHandler(getMessages));

// POST /:agentId/messages - отправить сообщение агенту
router.post('/:agentId/messages', asyncHandler(postMessage));

// DELETE /:agentId/messages - удалить все сообщения агента
router.delete('/:agentId/messages', asyncHandler(deleteMessages));

export default router;

