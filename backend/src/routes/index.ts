import { Router } from 'express';
import authRouter from './auth';
import agentsRouter from './agents';
import projectsRouter from './projects';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use('/auth', authRouter);
router.use('/projects', authMiddleware, projectsRouter);
router.use('/agents', authMiddleware, agentsRouter);

export default router;

