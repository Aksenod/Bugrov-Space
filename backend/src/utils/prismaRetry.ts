import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { logger } from './logger';

/**
 * Коды ошибок Prisma, связанные с подключением к БД
 */
const CONNECTION_ERROR_CODES = ['P1001', 'P1002', 'P1017'] as const;

/**
 * Проверяет, является ли ошибка ошибкой подключения к БД
 */
function isConnectionError(error: any): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    CONNECTION_ERROR_CODES.includes(error.code as any)
  );
}

/**
 * Задержка перед повторной попыткой (экспоненциальная)
 * Оптимизировано для более быстрого ответа при ошибках
 */
function getRetryDelay(attempt: number): number {
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    // Для продакшена: 200ms, 400ms, 800ms, 1600ms (максимум 2 секунды)
    return Math.min(200 * Math.pow(2, attempt), 2000);
  } else {
    // Для разработки: 100ms, 200ms, 400ms
    return Math.min(100 * Math.pow(2, attempt), 500);
  }
}

/**
 * Переподключается к базе данных
 * При ошибке P1017 (Server has closed the connection) нужно сначала отключиться, затем подключиться заново
 */
async function reconnect(): Promise<void> {
  try {
    // При ошибке закрытия соединения сначала отключаемся
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      // Игнорируем ошибки отключения - соединение может быть уже закрыто
      logger.debug({ disconnectError }, 'Disconnect before reconnect failed (this is usually fine)');
    }
    
    // Затем подключаемся заново
    await prisma.$connect();
    logger.info('Database reconnected successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to reconnect to database');
    throw error;
  }
}

/**
 * Выполняет Prisma запрос с автоматическим retry при ошибках подключения
 * 
 * @param operation - Функция, выполняющая Prisma запрос
 * @param maxRetries - Максимальное количество попыток (по умолчанию 3)
 * @param operationName - Имя операции для логирования (опционально)
 * @returns Результат выполнения операции
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  operationName?: string
): Promise<T> {
  // Для продакшена используем стандартное количество попыток (не увеличиваем)
  // Это ускоряет отдачу ошибок пользователю
  const isProduction = process.env.NODE_ENV === 'production';
  const actualMaxRetries = isProduction ? Math.max(maxRetries, 2) : maxRetries; // Уменьшено с 3 до 2 для более быстрого ответа
  let lastError: any;

  for (let attempt = 0; attempt < actualMaxRetries; attempt++) {
    try {
      // Пытаемся выполнить операцию
      const result = await operation();
      
      // Если это первая попытка после ошибки подключения, логируем успех
      if (attempt > 0) {
        logger.info(
          { attempt: attempt + 1, operationName },
          `Database operation succeeded after retry`
        );
      }
      
      return result;
    } catch (error: any) {
      lastError = error;

      // Проверяем, является ли это ошибкой подключения
      if (isConnectionError(error)) {
        const errorCode = (error as Prisma.PrismaClientKnownRequestError).code;
        logger.warn(
          {
            attempt: attempt + 1,
            maxRetries: actualMaxRetries,
            errorCode,
            errorMessage: error.message,
            operationName,
          },
          `Database connection error (${errorCode}), attempting retry`
        );

        // Если это не последняя попытка, пытаемся переподключиться
        if (attempt < actualMaxRetries - 1) {
          const delay = getRetryDelay(attempt);
          logger.info(
            { delay, attempt: attempt + 1, maxRetries: actualMaxRetries },
            `Waiting ${delay}ms before retry`
          );
          
          // Ждем перед повторной попыткой
          await new Promise((resolve) => setTimeout(resolve, delay));
          
          // Пытаемся переподключиться
          try {
            await reconnect();
          } catch (reconnectError) {
            logger.error(
              { reconnectError, attempt: attempt + 1 },
              'Failed to reconnect, will retry operation anyway'
            );
            // Продолжаем попытки даже если переподключение не удалось
          }
          
          // Продолжаем цикл для следующей попытки
          continue;
        } else {
          // Это была последняя попытка
          logger.error(
            {
              errorCode,
              errorMessage: error.message,
              maxRetries: actualMaxRetries,
              operationName,
            },
            `Database connection error after ${actualMaxRetries} attempts`
          );
        }
      } else {
        // Это не ошибка подключения, не нужно retry
        logger.debug(
          { error: error.message, operationName },
          'Non-connection error, not retrying'
        );
        throw error;
      }
    }
  }

  // Если дошли сюда, все попытки исчерпаны
  logger.error(
    {
      error: lastError?.message,
      maxRetries: actualMaxRetries,
      operationName,
    },
    `All retry attempts exhausted`
  );
  // Важно: пробрасываем оригинальную ошибку Prisma, чтобы errorHandler мог её правильно обработать
  throw lastError;
}

