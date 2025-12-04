import { Router } from 'express';
import agentsRoutes from './agents.routes';
import filesRoutes from './files.routes';
import projectTypesRoutes from './projectTypes.routes';

const router = Router();

// Подключаем все роуты
// Важно: files и projectTypes должны быть ПЕРЕД agents, чтобы более специфичные маршруты обрабатывались первыми
router.use('/', filesRoutes);
router.use('/', projectTypesRoutes);
router.use('/', agentsRoutes);

export default router;

