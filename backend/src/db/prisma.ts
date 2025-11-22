import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: ['error', 'warn'],
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
      console.log('[Prisma] ✅ Foreign keys enabled for SQLite');
    }
  } catch (error) {
    // Игнорируем ошибку, если это не SQLite или если foreign keys уже включены
    console.warn('[Prisma] Could not enable foreign keys (may not be SQLite or already enabled)');
  }
})();

// Логируем путь к базе данных при старте (только если доступен)
if (process.env.DATABASE_URL) {
  console.log(`[Prisma] Используется база данных: ${process.env.DATABASE_URL}`);
  console.log(`[Prisma] Тип базы: SQLite (файловая база, данные сохраняются на диск)`);
} else {
  console.warn(`[Prisma] DATABASE_URL не установлен, используется значение по умолчанию из schema.prisma`);
}


