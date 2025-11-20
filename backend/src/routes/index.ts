import { Router } from 'express';
import authRouter from './auth';
import agentsRouter from './agents';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use('/auth', authRouter);
router.use('/agents', authMiddleware, agentsRouter);

export default router;

