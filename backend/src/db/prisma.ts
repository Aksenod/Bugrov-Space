import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

// Функция для улучшения DATABASE_URL с параметрами пула соединений
function enhanceDatabaseUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  
  // Если URL уже содержит параметры, перезаписываем их нашими оптимизированными значениями
  if (url.includes('?')) {
    const urlObj = new URL(url);
    // Перезаписываем параметры нашими оптимизированными значениями
    urlObj.searchParams.set('connection_limit', '20'); // Увеличено для параллельных запросов
    urlObj.searchParams.set('pool_timeout', '5'); // Увеличено для медленных подключений
    urlObj.searchParams.set('connect_timeout', '5'); // Увеличено для медленных подключений
    urlObj.searchParams.set('statement_timeout', '3000'); // Уменьшено до 3 секунд для быстрого ответа
    // Добавляем параметры для keep-alive соединений
    urlObj.searchParams.set('keepalive', 'true');
    urlObj.searchParams.set('keepalive_idle', '600'); // 10 минут
    return urlObj.toString();
  }
  
  // Добавляем параметры для более стабильного подключения к удаленной БД
  // connection_limit: максимальное количество соединений в пуле (увеличено для параллельных запросов)
  // pool_timeout: таймаут ожидания соединения из пула (в секундах) - увеличено до 5s
  // connect_timeout: таймаут установки соединения (в секундах) - увеличено до 5s
  // statement_timeout: таймаут выполнения запроса (в миллисекундах) - уменьшено до 3s для быстрого ответа
  // keepalive: включить keep-alive для соединений
  // keepalive_idle: время простоя перед отправкой keep-alive (в секундах)
  return `${url}?connection_limit=20&pool_timeout=5&connect_timeout=5&statement_timeout=3000&keepalive=true&keepalive_idle=600`;
}

export const prisma = new PrismaClient({
  log: [
    { level: 'error', emit: 'event' },
    { level: 'warn', emit: 'event' },
  ],
  datasources: {
    db: {
      url: enhanceDatabaseUrl(process.env.DATABASE_URL),
    },
  },
});

// Обработка событий Prisma - объединяем логирование и обработку ошибок подключения
prisma.$on('error' as never, (e: any) => {
  // Логируем все ошибки
  logger.error({ prisma: 'error', errorCode: e.code }, e.message);
  
  // Проверяем, является ли это ошибкой подключения
  if (e.code === 'P1001' || e.code === 'P1002' || e.code === 'P1017') {
    logger.warn(
      { errorCode: e.code, errorMessage: e.message },
      'Database connection error detected, will attempt reconnection on next query'
    );
  }
});

prisma.$on('warn' as never, (e: any) => {
  logger.warn({ prisma: 'warn' }, e.message);
});

/**
 * Проверяет соединение с базой данных и переподключается при необходимости
 */
export async function ensureConnection(): Promise<void> {
  try {
    // Простой запрос для проверки соединения
    await prisma.$queryRaw`SELECT 1`;
  } catch (error: any) {
    // Если соединение потеряно, пытаемся переподключиться
    if (error.code === 'P1001' || error.code === 'P1002' || error.code === 'P1017') {
      logger.warn({ errorCode: error.code }, 'Connection lost, attempting to reconnect');
      try {
        await prisma.$connect();
        logger.info('Database reconnected successfully');
      } catch (reconnectError) {
        logger.error({ reconnectError }, 'Failed to reconnect to database');
        throw reconnectError;
      }
    } else {
      throw error;
    }
  }
}

// Логируем путь к базе данных при старте
if (process.env.DATABASE_URL) {
  const dbUrl = process.env.DATABASE_URL;
  // Скрываем пароль в логах
  const safeUrl = dbUrl.replace(/:[^:@]+@/, ':****@');
  logger.info({
    databaseUrl: safeUrl,
    databaseType: 'PostgreSQL',
  }, 'Database connection configured');
} else {
  logger.warn('DATABASE_URL not set, using default from schema.prisma');
}


