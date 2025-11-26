import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, beforeEach } from '@jest/globals';

// Используем существующую базу данных для тестов (с очисткой перед каждым тестом)
// В продакшене лучше использовать отдельную тестовую базу
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'file:./dev.db';

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: TEST_DATABASE_URL,
    },
  },
});

// PostgreSQL поддерживает foreign keys по умолчанию
// Никаких дополнительных настроек не требуется

// Очистка базы данных перед каждым тестом
beforeEach(async () => {
  try {
    // Удаляем в правильном порядке из-за foreign keys
    await prisma.message.deleteMany();
    await prisma.file.deleteMany();
    await prisma.agent.deleteMany();
    await prisma.project.deleteMany();
    await (prisma as any).projectTypeAgentProjectType.deleteMany();
    await (prisma as any).projectTypeAgent.deleteMany();
    await prisma.projectType.deleteMany();
    await prisma.user.deleteMany();
  } catch (error) {
    // Игнорируем ошибки очистки (например, если таблицы не существуют)
    console.warn('Failed to clean test database:', error);
  }
});

// Закрываем соединение после всех тестов
afterAll(async () => {
  await prisma.$disconnect();
});

