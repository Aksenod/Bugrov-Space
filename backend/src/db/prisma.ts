import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// Включаем поддержку внешних ключей для SQLite
prisma.$executeRaw`PRAGMA foreign_keys = ON`.catch(() => {
  // Игнорируем ошибку, если это не SQLite
});

// Логируем путь к базе данных при старте (только если доступен)
if (process.env.DATABASE_URL) {
  console.log(`[Prisma] Используется база данных: ${process.env.DATABASE_URL}`);
  console.log(`[Prisma] Тип базы: SQLite (файловая база, данные сохраняются на диск)`);
} else {
  console.warn(`[Prisma] DATABASE_URL не установлен, используется значение по умолчанию из schema.prisma`);
}


