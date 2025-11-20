import jwt from 'jsonwebtoken';
import { env } from '../env';

const SECRET = env.jwtSecret;
const EXPIRES_IN = '7d';

interface TokenPayload {
  userId: string;
}

export function signToken(userId: string): string {
  if (!SECRET) {
    throw new Error('JWT_SECRET is not defined');
  }
  return jwt.sign({ userId }, SECRET, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload {
  if (!SECRET) {
    throw new Error('JWT_SECRET is not defined');
  }
  return jwt.verify(token, SECRET) as TokenPayload;
}

