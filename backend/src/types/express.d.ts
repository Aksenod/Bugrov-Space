import 'express-serve-static-core';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

// Тип для аутентифицированных запросов (после authMiddleware)
export interface AuthenticatedRequest extends Express.Request {
  userId: string;
}

export {};

