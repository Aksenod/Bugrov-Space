import { Router } from 'express';
import agentsRoutes from './agents.routes';
import messagesRoutes from './messages.routes';
import filesRoutes from './files.routes';
import summaryRoutes from './summary.routes';
import prototypeRoutes from './prototype.routes';

const router = Router();

// Подключаем все роуты
router.use('/', agentsRoutes);
router.use('/', messagesRoutes);
router.use('/', filesRoutes);
router.use('/', summaryRoutes);
router.use('/', prototypeRoutes);

export default router;

