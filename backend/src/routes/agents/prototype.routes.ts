import { Router } from 'express';
import { generatePrototype, getPrototypeVersions, deletePrototypeVersion } from '../../controllers/agents/prototypeController';
import { authMiddleware } from '../../middleware/authMiddleware';
import { asyncHandler } from '../../middleware/errorHandler';

const router = Router();

// POST /:agentId/files/:fileId/generate-prototype - сгенерировать прототип
router.post('/:agentId/files/:fileId/generate-prototype', asyncHandler(generatePrototype));

// GET /files/:fileId/prototype-versions - получить все версии прототипа
router.get('/files/:fileId/prototype-versions', authMiddleware, asyncHandler(getPrototypeVersions));

// DELETE /files/:fileId/prototype-versions/:versionNumber - удалить версию прототипа
router.delete('/files/:fileId/prototype-versions/:versionNumber', authMiddleware, asyncHandler(deletePrototypeVersion));

export default router;

