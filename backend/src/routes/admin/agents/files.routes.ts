import { Router } from 'express';
import { getAgentFilesHandler, uploadAgentFileHandler, deleteAgentFileHandler } from '../../../controllers/admin/adminAgentFilesController';
import { asyncHandler } from '../../../middleware/errorHandler';

const router = Router();

// POST /:id/files - загрузить файл для агента-шаблона (должен быть ПЕРЕД /:id)
router.post('/:id/files', asyncHandler(uploadAgentFileHandler));

// GET /:id/files - получить файлы агента-шаблона (должен быть ПЕРЕД /:id)
router.get('/:id/files', asyncHandler(getAgentFilesHandler));

// DELETE /:id/files/:fileId - удалить файл агента-шаблона (должен быть ПЕРЕД /:id)
router.delete('/:id/files/:fileId', asyncHandler(deleteAgentFileHandler));

export default router;

