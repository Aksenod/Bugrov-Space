import { prisma } from '../../db/prisma';
import { logger } from '../logger';

/**
 * Проверить существование таблицы в базе данных
 */
export const checkTableExists = async (tableName: string): Promise<boolean> => {
  try {
    const result = await prisma.$queryRaw`
      SELECT name 
      FROM sqlite_master 
      WHERE type='table' AND name=${tableName}
      LIMIT 1
    `;
    return Array.isArray(result) && result.length > 0;
  } catch (error: any) {
    logger.warn({ tableName, error: error.message }, 'Could not check table existence');
    return false;
  }
};

/**
 * Проверить существование колонки в таблице
 */
export const checkColumnExists = async (tableName: string, columnName: string): Promise<boolean> => {
  try {
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = ${tableName} 
      AND column_name = ${columnName}
      LIMIT 1
    `;
    return Array.isArray(result) && result.length > 0;
  } catch (error: any) {
    // Для SQLite используем другой подход
    try {
      const result = await prisma.$queryRaw`
        SELECT name 
        FROM pragma_table_info(${tableName}) 
        WHERE name = ${columnName}
        LIMIT 1
      `;
      return Array.isArray(result) && result.length > 0;
    } catch (innerError: any) {
      logger.warn({ tableName, columnName, error: innerError.message }, 'Could not check column existence');
      return false;
    }
  }
};

/**
 * Обработать ошибку Prisma
 */
export const handlePrismaError = (error: any, context: string): { shouldRetry: boolean; userMessage?: string } => {
  // Ошибки о несуществующих таблицах/колонках
  if (error?.code === 'P2021' || 
      error?.message?.includes('does not exist') || 
      error?.message?.includes('relation') || 
      error?.message?.includes('column') ||
      error?.message?.includes('Unknown argument') ||
      error?.message?.includes('Unknown field')) {
    logger.warn({ context, error: error.message, code: error.code }, 'Prisma table/column may not exist');
    return { shouldRetry: false };
  }

  // Ошибки валидации Prisma Client
  if (error?.name === 'PrismaClientValidationError' || 
      error?.message?.includes('Argument `') ||
      error?.message?.includes('Invalid `prisma.')) {
    logger.error({ context, error: error.message, name: error.name }, 'Prisma Client validation error');
    return { 
      shouldRetry: false, 
      userMessage: 'Prisma Client needs regeneration' 
    };
  }

  // Ошибки внешнего ключа
  if (error?.code === 'P2003') {
    logger.error({ context, error: error.message, code: error.code }, 'Prisma foreign key error');
    return { 
      shouldRetry: false, 
      userMessage: 'Invalid reference to related record' 
    };
  }

  // Другие ошибки - можно повторить
  return { shouldRetry: true };
};

