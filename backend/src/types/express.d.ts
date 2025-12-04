import 'express-serve-static-core';
import { Request, ParamsDictionary, Query } from 'express-serve-static-core';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

// Тип для аутентифицированных запросов (после authMiddleware)
// Используем intersection type для правильного расширения Request с params
export interface AuthenticatedRequest<
  P extends ParamsDictionary = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery extends Query = Query
> extends Request<P, ResBody, ReqBody, ReqQuery> {
  userId: string;
}

export {};

