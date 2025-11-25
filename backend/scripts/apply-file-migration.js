#!/usr/bin/env node
/**
 * Скрипт для применения миграции добавления поля projectTypeAgentId в таблицу File
 * Использование: node scripts/apply-file-migration.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('Applying migration: add projectTypeAgentId to File table...');
    
    // Проверяем, существует ли уже поле
    const checkQuery = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'File' 
      AND column_name = 'projectTypeAgentId'
      LIMIT 1
    `;
    
    if (Array.isArray(checkQuery) && checkQuery.length > 0) {
      console.log('✅ Column projectTypeAgentId already exists in File table');
      await prisma.$disconnect();
      return;
    }

    console.log('Column projectTypeAgentId does not exist, applying migration...');

    // Применяем миграцию
    await prisma.$executeRaw`
      ALTER TABLE "File" ADD COLUMN "projectTypeAgentId" TEXT
    `;
    console.log('✅ Added column projectTypeAgentId');

    // Создаем индексы
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "File_projectTypeAgentId_idx" ON "File"("projectTypeAgentId")
    `);
    console.log('✅ Created index File_projectTypeAgentId_idx');

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "File_projectTypeAgentId_isKnowledgeBase_idx" ON "File"("projectTypeAgentId", "isKnowledgeBase")
    `);
    console.log('✅ Created index File_projectTypeAgentId_isKnowledgeBase_idx');

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "File_projectTypeAgentId_createdAt_idx" ON "File"("projectTypeAgentId", "createdAt")
    `);
    console.log('✅ Created index File_projectTypeAgentId_createdAt_idx');

    // Делаем agentId nullable
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "File" ALTER COLUMN "agentId" DROP NOT NULL
    `);
    console.log('✅ Made agentId nullable');

    // Помечаем миграцию как примененную
    await prisma.$executeRawUnsafe(`
      INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
      SELECT gen_random_uuid()::text, '', NOW(), '20251126200000_add_project_type_agent_id_to_file', '', NULL, NOW(), 1
      WHERE NOT EXISTS (
        SELECT 1 FROM "_prisma_migrations" 
        WHERE migration_name = '20251126200000_add_project_type_agent_id_to_file'
      )
    `);
    console.log('✅ Marked migration as applied');

    console.log('✅ Migration applied successfully!');
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();

