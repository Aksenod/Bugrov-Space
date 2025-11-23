import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export const prisma = new PrismaClient({
  log: [
    { level: 'error', emit: 'event' },
    { level: 'warn', emit: 'event' },
  ],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Настройки для более стабильного подключения к удаленной БД
  // connection_limit: 10, // Максимум соединений в пуле
  // pool_timeout: 20, // Таймаут ожидания соединения из пула (секунды)
});

// Логируем события Prisma
prisma.$on('error' as never, (e: any) => {
  logger.error({ prisma: 'error' }, e.message);
});

prisma.$on('warn' as never, (e: any) => {
  logger.warn({ prisma: 'warn' }, e.message);
});

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


