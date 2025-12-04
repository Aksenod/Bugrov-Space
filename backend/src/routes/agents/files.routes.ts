import { Router } from 'express';
import { getAgentFiles, getSummaryFiles, deleteFile, updateFile } from '../../controllers/agents/filesController';
import { forbidAgentMutation } from '../../controllers/agents/agentsController';
import { asyncHandler } from '../../middleware/errorHandler';

const router = Router();

// POST /:agentId/files - создать файл (запрещено)
router.post('/:agentId/files', forbidAgentMutation);

// GET /:agentId/files - получить файлы базы знаний агента
router.get('/:agentId/files', asyncHandler(getAgentFiles));

// GET /:agentId/files/summary - получить файлы для генерации саммари
router.get('/:agentId/files/summary', asyncHandler(getSummaryFiles));

// DELETE /files/:fileId - удалить файл (должен быть ВЫШЕ /:agentId/files/:fileId)
router.delete('/files/:fileId', asyncHandler(deleteFile));

// DELETE /:agentId/files/:fileId - удалить файл (запрещено)
router.delete('/:agentId/files/:fileId', forbidAgentMutation);

// PATCH /files/:fileId - обновить содержимое файла
router.patch('/files/:fileId', asyncHandler(updateFile));

export default router;

