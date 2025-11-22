import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// Логируем путь к базе данных при старте (только если доступен)
if (process.env.DATABASE_URL) {
  console.log(`[Prisma] Используется база данных: ${process.env.DATABASE_URL}`);
  console.log(`[Prisma] Тип базы: SQLite (файловая база, данные сохраняются на диск)`);
} else {
  console.warn(`[Prisma] DATABASE_URL не установлен, используется значение по умолчанию из schema.prisma`);
}


