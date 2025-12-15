import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { hashPassword, verifyPassword } from '../utils/password';
import { signToken } from '../utils/token';
import { authMiddleware } from '../middleware/authMiddleware';
import { authRateLimiter } from '../middleware/rateLimitMiddleware';
import { AuthenticatedRequest } from '../types/express';
import { withRetry } from '../utils/prismaRetry';

const authRouter = Router();

// Normalize username: trim and convert to lowercase
const normalizeUsername = (username: string): string => {
  return username.trim().toLowerCase();
};

const registerSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscore'),
  password: z.string().min(6),
}).transform((data) => ({
  ...data,
  username: normalizeUsername(data.username),
}));

authRouter.post('/register', authRateLimiter, async (req, res, next) => {
  try {
    console.log('[Register] Request body:', JSON.stringify(req.body));
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      console.log('[Register] Validation failed:', parsed.error.issues);
      const errorMessages = parsed.error.issues.map((err) => {
        if (err.path.length > 0) {
          return `${err.path.join('.')}: ${err.message}`;
        }
        return err.message;
      }).join(', ');
      return res.status(400).json({ error: `Validation error: ${errorMessages}` });
    }

    const { username, password } = parsed.data;
    console.log('[Register] Normalized username:', username);

    const existing = await withRetry(
      () => prisma.user.findUnique({ where: { username } }),
      2,
      'register-check-existing'
    );
    if (existing) {
      console.log('[Register] Username already exists:', username);
      return res.status(409).json({ error: 'Username already taken' });
    }

    const passwordHash = await hashPassword(password.trim());
    const user = await withRetry(
      () => prisma.user.create({
        data: {
          username,
          passwordHash,
        },
      }),
      2,
      'register-create-user'
    );

    console.log('[Register] User created:', user.id);
    const token = signToken(user.id);
    return res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      agents: [],
    });
  } catch (error: any) {
    console.error('[Register] Error:', error);
    // Пробрасываем ошибку в errorHandler для правильной обработки Prisma ошибок
    next(error);
  }
});

const loginSchema = z.object({
  username: z.string().min(3).max(20),
  password: z.string().min(1),
}).transform((data) => ({
  ...data,
  username: normalizeUsername(data.username),
}));

authRouter.post('/login', authRateLimiter, async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMessages = parsed.error.issues.map((err) => {
        if (err.path.length > 0) {
          return `${err.path.join('.')}: ${err.message}`;
        }
        return err.message;
      }).join(', ');
      return res.status(400).json({ error: `Validation error: ${errorMessages}` });
    }

    const { username, password } = parsed.data;
    console.log('[Login] Attempting login for username:', username);

    const user = await withRetry(
      () => prisma.user.findUnique({ where: { username } }),
      2,
      'login-find-user'
    );
    if (!user) {
      console.log('[Login] User not found:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await verifyPassword(password.trim(), user.passwordHash);
    if (!valid) {
      console.log('[Login] Invalid password for user:', username);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('[Login] Successful login for user:', username);
    const token = signToken(user.id);
    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        isPaid: user.isPaid,
        subscriptionExpiresAt: user.subscriptionExpiresAt,
        hasFreeAccess: user.hasFreeAccess,
      },
    });
  } catch (error: any) {
    console.error('[Login] Error:', error);
    // Пробрасываем ошибку в errorHandler
    next(error);
  }
});

const resetSchema = z.object({
  username: z.string().min(3).max(20),
  newPassword: z.string().min(6),
}).transform((data) => ({
  ...data,
  username: normalizeUsername(data.username),
}));

authRouter.post('/reset', authRateLimiter, async (req, res, next) => {
  try {
    const parsed = resetSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMessages = parsed.error.issues.map((err) => {
        if (err.path.length > 0) {
          return `${err.path.join('.')}: ${err.message}`;
        }
        return err.message;
      }).join(', ');
      return res.status(400).json({ error: `Validation error: ${errorMessages}` });
    }

    const { username, newPassword } = parsed.data;
    console.log('[Reset] Attempting password reset for username:', username);

    const user = await withRetry(
      () => prisma.user.findUnique({ where: { username } }),
      2,
      'reset-find-user'
    );

    if (!user) {
      console.log('[Reset] User not found:', username);
      return res.status(404).json({ error: 'User not found' });
    }

    const passwordHash = await hashPassword(newPassword.trim());
    await withRetry(
      () => prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      2,
      'reset-update-password'
    );

    console.log('[Reset] Password reset successful for user:', username);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('[Reset] Error:', error);
    // Пробрасываем ошибку в errorHandler
    next(error);
  }
});

authRouter.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await withRetry(
      () => prisma.user.findUnique({
        where: { id: authReq.userId },
        select: {
          id: true,
          username: true,
          role: true,
          isPaid: true,
          subscriptionExpiresAt: true,
          hasFreeAccess: true,
        },
      }),
      2,
      'me-find-user'
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({ user });
  } catch (error) {
    next(error);
  }
});

export default authRouter;

