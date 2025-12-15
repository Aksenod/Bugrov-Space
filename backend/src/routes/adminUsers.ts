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
    console.log('[GET /admin/users] Request headers:', JSON.stringify(req.headers, null, 2));

    // Получаем общее количество пользователей и проектов
    const [totalUsersCount, totalProjectsCount] = await Promise.all([
      withRetry(
        () => prisma.user.count(),
        2,
        'GET /admin/users - count users'
      ),
      withRetry(
        () => prisma.project.count(),
        2,
        'GET /admin/users - count projects'
      ),
    ]);
    console.log(`[GET /admin/users] Total users in database: ${totalUsersCount}`);
    console.log(`[GET /admin/users] Total projects in database: ${totalProjectsCount}`);

    const users = await withRetry(
      () => prisma.user.findMany({
        select: {
          id: true,
          username: true,
          createdAt: true,
          isPaid: true,
          subscriptionExpiresAt: true,
          hasFreeAccess: true,
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

    // Логируем информацию о каждом пользователе для отладки
    if (users.length > 0) {
      console.log('[GET /admin/users] Users details:', users.map(u => ({
        id: u.id,
        username: u.username,
        createdAt: u.createdAt,
        projectsCount: u._count.projects,
        isPaid: u.isPaid,
        subscriptionExpiresAt: u.subscriptionExpiresAt,
      })));
    } else {
      console.log('[GET /admin/users] WARNING: No users found in database!');
    }

    const usersWithCount = users.map(user => ({
      id: user.id,
      username: user.username,
      createdAt: user.createdAt.toISOString(), // Явно конвертируем в ISO строку
      projectsCount: user._count.projects,
      isPaid: user.isPaid,
      subscriptionExpiresAt: user.subscriptionExpiresAt ? user.subscriptionExpiresAt.toISOString() : null,
      hasFreeAccess: user.hasFreeAccess,
    }));

    logger.info({ usersCount: usersWithCount.length }, 'Admin users fetched');
    
    // Логируем информацию о подписках для диагностики
    const paidUsers = usersWithCount.filter(u => u.isPaid);
    console.log(`[GET /admin/users] Returning ${usersWithCount.length} users`);
    console.log(`[GET /admin/users] Paid users count: ${paidUsers.length}`);
    if (paidUsers.length > 0) {
      console.log('[GET /admin/users] Paid users details:', paidUsers.map(u => ({
        username: u.username,
        isPaid: u.isPaid,
        subscriptionExpiresAt: u.subscriptionExpiresAt,
      })));
    }
    
    res.json({
      users: usersWithCount,
      totalUsers: totalUsersCount,
      totalProjects: totalProjectsCount,
    });
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

// PATCH /:userId/free-access - переключить бесплатный доступ для пользователя
router.patch('/:userId/free-access', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { hasFreeAccess } = req.body;

  if (typeof hasFreeAccess !== 'boolean') {
    return res.status(400).json({ error: 'hasFreeAccess must be a boolean' });
  }

  console.log(`[PATCH /admin/users/${userId}/free-access] Setting hasFreeAccess to ${hasFreeAccess}`);

  const user = await withRetry(
    () => prisma.user.update({
      where: { id: userId },
      data: { hasFreeAccess },
      select: {
        id: true,
        username: true,
        hasFreeAccess: true,
      },
    }),
    3,
    `PATCH /admin/users/${userId}/free-access`
  );

  logger.info({ userId, hasFreeAccess }, 'User free access updated');
  console.log(`[PATCH /admin/users/${userId}/free-access] Successfully updated user ${user.username}`);

  res.json({ success: true, user });
}));

export default router;

