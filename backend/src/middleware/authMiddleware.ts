import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/token';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = header.replace('Bearer ', '');
  try {
    const payload = verifyToken(token);
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

