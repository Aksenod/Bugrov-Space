import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export const prisma = new PrismaClient({
  log: [
    { level: 'error', emit: 'event' },
    { level: 'warn', emit: 'event' },
  ],
});

// Логируем события Prisma
prisma.$on('error' as never, (e: any) => {
  logger.error({ prisma: 'error' }, e.message);
});

prisma.$on('warn' as never, (e: any) => {
  logger.warn({ prisma: 'warn' }, e.message);
});

// Включаем поддержку внешних ключей для SQLite
// Используем $queryRawUnsafe вместо $executeRaw, так как PRAGMA statements
// не работают в prepared statements, которые использует $executeRaw
(async () => {
  try {
    // Проверяем, что это SQLite (по DATABASE_URL)
    const dbUrl = process.env.DATABASE_URL || '';
    if (dbUrl.includes('sqlite') || dbUrl.includes('.db')) {
      await prisma.$queryRawUnsafe('PRAGMA foreign_keys = ON');
      logger.info('Foreign keys enabled for SQLite');
    }
  } catch (error) {
    // Игнорируем ошибку, если это не SQLite или если foreign keys уже включены
    logger.warn('Could not enable foreign keys (may not be SQLite or already enabled)');
  }
})();

// Логируем путь к базе данных при старте (только если доступен)
if (process.env.DATABASE_URL) {
  logger.info({
    databaseUrl: process.env.DATABASE_URL,
    databaseType: 'SQLite',
  }, 'Database connection configured');
} else {
  logger.warn('DATABASE_URL not set, using default from schema.prisma');
}


