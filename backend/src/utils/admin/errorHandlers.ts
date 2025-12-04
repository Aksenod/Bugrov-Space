import { Response } from 'express';
import { logger } from '../logger';
import { env } from '../../env';
import { handlePrismaError } from './prismaHelpers';

/**
 * Обработать ошибку отсутствия таблицы
 */
export const handleTableNotFoundError = (error: any, res: Response, context: string) => {
  logger.error({ 
    context,
    error: error.message, 
    code: error.code,
    meta: error.meta,
    stack: error.stack 
  }, 'Table does not exist - migration may not be applied');
  
  return res.status(500).json({ 
    error: 'Database migration required',
    message: 'The database tables have not been created. Please ensure migrations are applied.',
    details: env.nodeEnv === 'development' ? error.message : undefined
  });
};

/**
 * Обработать ошибку отсутствия колонки
 */
export const handleColumnNotFoundError = (error: any, res: Response, context: string, columnName: string) => {
  logger.error({ 
    context,
    columnName,
    error: error.message, 
    code: error.code 
  }, 'Column does not exist - migration may not be applied');
  
  return res.status(500).json({ 
    error: 'Ошибка базы данных: поле не найдено',
    message: `Поле ${columnName} не найдено в таблице. Возможно, миграция не применена. Обратитесь к администратору.`,
    details: env.nodeEnv === 'development' ? error.message : undefined
  });
};

/**
 * Обработать ошибку валидации
 */
export const handleValidationError = (error: any, res: Response, context: string) => {
  logger.error({ 
    context,
    error: error.message, 
    name: error.name,
    code: error.code,
    meta: error.meta,
    stack: error.stack 
  }, 'Validation error');
  
  if (error?.name === 'PrismaClientValidationError' || 
      error?.message?.includes('Argument `') ||
      error?.message?.includes('Invalid `prisma.')) {
    return res.status(500).json({ 
      error: 'Prisma Client needs regeneration',
      message: 'The Prisma Client was generated with an old schema. Please redeploy to regenerate the client.',
      details: env.nodeEnv === 'development' ? error.message : undefined
    });
  }
  
  return res.status(400).json({ 
    error: 'Validation error',
    message: error.message || 'Invalid data provided'
  });
};

/**
 * Форматировать ошибку Prisma для пользователя
 */
export const formatPrismaError = (error: any, context: string): string => {
  const { userMessage } = handlePrismaError(error, context);
  
  if (userMessage) {
    return userMessage;
  }
  
  if (error?.code) {
    return `Database error (${error.code}): ${error.message || 'Unknown error'}`;
  }
  
  return error.message || 'Unknown database error';
};

