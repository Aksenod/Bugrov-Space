import { Router } from 'express';
import { getProjectTypesHandler, attachToProjectTypesHandler, detachFromProjectTypeHandler } from '../../../controllers/admin/adminAgentProjectTypesController';
import { asyncHandler } from '../../../middleware/errorHandler';

const router = Router();

// GET /:id/project-types - получить типы проектов, к которым привязан агент
router.get('/:id/project-types', asyncHandler(getProjectTypesHandler));

// POST /:id/project-types - привязать агента к типам проектов
router.post('/:id/project-types', asyncHandler(attachToProjectTypesHandler));

// DELETE /:id/project-types/:projectTypeId - отвязать агента от типа проекта
router.delete('/:id/project-types/:projectTypeId', asyncHandler(detachFromProjectTypeHandler));

export default router;

