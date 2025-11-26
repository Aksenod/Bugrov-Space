import { Request, Response, NextFunction } from 'express';
import { prisma } from '../db/prisma';
import { withRetry } from '../utils/prismaRetry';
import { AuthenticatedRequest } from '../types/express';

const ADMIN_USERNAMES = new Set(['admin', 'aksenod']);

export async function adminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const user = await withRetry(
      () =>
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            username: true,
            role: true,
          },
        }),
      2,
      'adminMiddleware.findUser',
    );

    const role = user?.role?.trim().toLowerCase();
    const isAdmin =
      role === 'admin' || (user?.username && ADMIN_USERNAMES.has(user.username));

    if (!user || !isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }

    return next();
  } catch (error) {
    return next(error);
  }
}
