import { Router } from 'express';
import agentsRoutes from './agents.routes';
import messagesRoutes from './messages.routes';
import filesRoutes from './files.routes';
import summaryRoutes from './summary.routes';
import prototypeRoutes from './prototype.routes';
import voiceRoutes from './voice.routes';

const router = Router();

// Подключаем все роуты
router.use('/', agentsRoutes);
router.use('/', messagesRoutes);
router.use('/', filesRoutes);
router.use('/', summaryRoutes);
router.use('/', prototypeRoutes);
router.use('/voice', voiceRoutes);

export default router;

