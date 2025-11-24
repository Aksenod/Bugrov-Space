import { Router } from 'express';
import authRouter from './auth';
import agentsRouter from './agents';
import projectsRouter from './projects';
import projectTypesRouter from './projectTypes';
import adminAgentsRouter from './adminAgents';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use('/auth', authRouter);
router.use('/projects', authMiddleware, projectsRouter);
router.use('/agents', authMiddleware, agentsRouter);
router.use('/project-types', projectTypesRouter);
router.use('/admin/agents', authMiddleware, adminAgentsRouter);

export default router;

