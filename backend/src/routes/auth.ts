import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { hashPassword, verifyPassword } from '../utils/password';
import { signToken } from '../utils/token';
import { authMiddleware } from '../middleware/authMiddleware';
import { authRateLimiter } from '../middleware/rateLimitMiddleware';
import { AuthenticatedRequest } from '../types/express';

const authRouter = Router();

// Normalize username: trim and convert to lowercase
const normalizeUsername = (username: string): string => {
  return username.trim().toLowerCase();
};

const registerSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(6),
}).transform((data) => ({
  ...data,
  username: normalizeUsername(data.username),
}));

authRouter.post('/register', authRateLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
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
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return res.status(409).json({ error: 'Username already taken' });
  }

  const passwordHash = await hashPassword(password.trim());
  const user = await prisma.user.create({
    data: {
      username,
      passwordHash,
    },
  });

  const token = signToken(user.id);
  return res.status(201).json({
    token,
    user: {
      id: user.id,
      username: user.username,
    },
    agents: [],
  });
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
}).transform((data) => ({
  ...data,
  username: normalizeUsername(data.username),
}));

authRouter.post('/login', authRateLimiter, async (req, res) => {
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
});

const resetSchema = z.object({
  username: z.string().min(1),
  newPassword: z.string().min(6),
}).transform((data) => ({
  ...data,
  username: normalizeUsername(data.username),
}));

authRouter.post('/reset', authRateLimiter, async (req, res) => {
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
});

authRouter.get('/me', authMiddleware, async (req, res) => {
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
});

export default authRouter;

