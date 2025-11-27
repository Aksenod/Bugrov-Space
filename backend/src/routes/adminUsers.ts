import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';
import { withRetry } from '../utils/prismaRetry';

const router = Router();

// GET / - получить всех пользователей с количеством проектов
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    console.log('[GET /admin/users] Request received');
    const users = await withRetry(
      () => prisma.user.findMany({
        select: {
          id: true,
          username: true,
          createdAt: true,
          _count: {
            select: {
              projects: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      3,
      'GET /admin/users - find users'
    );

    console.log(`[GET /admin/users] Found ${users.length} users in database`);
    
    const usersWithCount = users.map(user => ({
      id: user.id,
      username: user.username,
      createdAt: user.createdAt.toISOString(), // Явно конвертируем в ISO строку
      projectsCount: user._count.projects,
    }));

    logger.info({ usersCount: usersWithCount.length }, 'Admin users fetched');
    console.log(`[GET /admin/users] Returning ${usersWithCount.length} users`);
    res.json({ users: usersWithCount });
  } catch (error: any) {
    logger.error({ 
      error: error.message, 
      stack: error.stack, 
      code: error.code, 
      meta: error.meta,
    }, 'GET /admin/users error');
    console.error('[GET /admin/users] Error:', error);
    throw error;
  }
}));

export default router;

