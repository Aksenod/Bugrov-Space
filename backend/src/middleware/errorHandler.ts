import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { env } from '../env';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class ApiError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: Error | AppError | ZodError | Prisma.PrismaClientKnownRequestError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      details: err.flatten(),
    });
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      // Определяем, какое поле вызвало ошибку уникальности
      const target = (err.meta as any)?.target;
      let message = 'A record with this value already exists';
      if (Array.isArray(target) && target.includes('username')) {
        message = 'Username already taken';
      }
      return res.status(409).json({
        error: 'Unique constraint violation',
        message,
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        error: 'Record not found',
        message: 'The requested record does not exist',
      });
    }
    // Обработка других известных кодов ошибок Prisma
    if (err.code === 'P1001' || err.code === 'P1002' || err.code === 'P1017') {
      // Ошибки подключения к БД
      // P1001: Can't reach database server
      // P1002: The database server at {host}:{port} was reached but timed out
      // P1017: Server has closed the connection
      logger.error({ code: err.code, message: err.message }, 'Prisma connection error');
      return res.status(503).json({
        error: 'Database connection error',
        message: env.nodeEnv === 'development' 
          ? `Database connection error (${err.code}): ${err.message}` 
          : 'Database is temporarily unavailable. Please try again later.',
      });
    }
    if (err.code === 'P2003') {
      // Foreign key constraint failed
      logger.error({ code: err.code, message: err.message, meta: err.meta }, 'Prisma foreign key error');
      return res.status(400).json({
        error: 'Database constraint error',
        message: env.nodeEnv === 'development' 
          ? `Foreign key constraint failed: ${err.message}` 
          : 'Invalid data provided',
      });
    }
    // P2021: Table does not exist
    if (err.code === 'P2021') {
      logger.error({ code: err.code, message: err.message, meta: err.meta }, 'Prisma table does not exist');
      return res.status(500).json({
        error: 'Database table does not exist',
        message: env.nodeEnv === 'development' 
          ? `Table does not exist (${err.code}): ${err.message}. Please run migrations.` 
          : 'Database migration required. Please contact administrator.',
      });
    }
    
    // Log unexpected Prisma errors
    logger.error({ code: err.code, message: err.message, meta: err.meta }, 'Unexpected Prisma error');
    return res.status(500).json({
      error: 'Database error',
      message: env.nodeEnv === 'development' 
        ? `Database error (${err.code}): ${err.message}` 
        : 'A database error occurred. Please try again later.',
    });
  }

  // Prisma connection errors
  if (err instanceof Prisma.PrismaClientInitializationError) {
    logger.error({ message: err.message, stack: err.stack }, 'Prisma client initialization error');
    return res.status(503).json({
      error: 'Database connection error',
      message: env.nodeEnv === 'development' 
        ? `Cannot connect to database: ${err.message}` 
        : 'Database is temporarily unavailable. Please try again later.',
    });
  }

  // Custom API errors
  if (err instanceof ApiError || (err as AppError).isOperational) {
    const statusCode = (err as AppError).statusCode || 500;
    return res.status(statusCode).json({
      error: err.message || 'An error occurred',
    });
  }

  // Unexpected errors - log in development, hide in production
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  }, 'Unexpected error');

  return res.status(500).json({
    error: 'Internal server error',
    message: env.nodeEnv === 'development' ? err.message : 'An unexpected error occurred',
  });
}

// Wrapper для async route handlers
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}



