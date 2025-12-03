import { Router } from 'express';
import authRouter from './auth';
import agentsRouter from './agents';
import projectsRouter from './projects';
import projectTypesRouter from './projectTypes';
import adminAgentsRouter from './adminAgents';
import adminGlobalPromptRouter from './adminGlobalPrompt';
import adminUsersRouter from './adminUsers';
import publicRoutes from './publicRoutes';
import paymentRoutes from './paymentRoutes';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = Router();

router.use('/auth', authRouter);
router.use('/projects', authMiddleware, projectsRouter);
router.use('/agents', authMiddleware, agentsRouter);
router.use('/project-types', projectTypesRouter);
router.use('/admin/agents', authMiddleware, adminAgentsRouter);
router.use('/admin/global-prompt', authMiddleware, adminMiddleware, adminGlobalPromptRouter);
router.use('/admin/users', authMiddleware, adminMiddleware, adminUsersRouter);
router.use('/public', publicRoutes);
router.use('/payment', paymentRoutes);

export default router;

