import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { hashPassword, verifyPassword } from '../utils/password';
import { signToken } from '../utils/token';
import { authMiddleware } from '../middleware/authMiddleware';
import { authRateLimiter } from '../middleware/rateLimitMiddleware';
import { AuthenticatedRequest } from '../types/express';
import { asyncHandler } from '../middleware/errorHandler';

const authRouter = Router();

// Normalize username: trim and convert to lowercase
const normalizeUsername = (username: string): string => {
  return username.trim().toLowerCase();
};

// Username validation: минимум 3 символа, максимум 20, только буквы/цифры/_
const usernameSchema = z.string()
  .min(3, 'Минимум 3 символа')
  .max(20, 'Максимум 20 символов')
  .regex(/^[a-zA-Z0-9_]+$/, 'Только буквы, цифры и _')
  .transform((val) => normalizeUsername(val));

const registerSchema = z.object({
  username: usernameSchema,
  password: z.string().min(6),
});

authRouter.post('/register', authRateLimiter, asyncHandler(async (req, res) => {
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
  
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    console.log('[Register] Username already exists:', username);
    return res.status(409).json({ error: 'Username already taken' });
  }

  const passwordHash = await hashPassword(password.trim());
  const user = await prisma.user.create({
    data: {
      username,
      passwordHash,
    },
  });

  console.log('[Register] User created:', user.id);
  const token = signToken(user.id);
  return res.status(201).json({
    token,
    user: {
      id: user.id,
      username: user.username,
    },
    agents: [],
  });
}));

const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1),
});

authRouter.post('/login', authRateLimiter, asyncHandler(async (req, res) => {
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
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await verifyPassword(password.trim(), user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signToken(user.id);
  return res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
    },
  });
}));

const resetSchema = z.object({
  username: usernameSchema,
  newPassword: z.string().min(6),
});

authRouter.post('/reset', authRateLimiter, asyncHandler(async (req, res) => {
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
  const user = await prisma.user.findUnique({ where: { username } });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const passwordHash = await hashPassword(newPassword.trim());
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return res.json({ success: true });
}));

authRouter.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  if (!authReq.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = await prisma.user.findUnique({
    where: { id: authReq.userId },
    select: {
      id: true,
      username: true,
    },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.json({ user });
}));

export default authRouter;

