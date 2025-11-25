#!/usr/bin/env node
/**
 * Скрипт для разрешения failed миграций в продакшене
 * Использование: node scripts/resolve-migration.js <migration-name>
 * 
 * Пример: node scripts/resolve-migration.js 20251125000000_add_project_model
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resolveMigration(migrationName) {
  try {
    console.log(`Resolving migration: ${migrationName}`);
    
    // Помечаем миграцию как примененную
    await prisma.$executeRawUnsafe(`
      UPDATE "_prisma_migrations" 
      SET finished_at = NOW(), 
          logs = 'Manually resolved via script'
      WHERE migration_name = $1::text
      AND finished_at IS NULL
    `, migrationName);
    
    console.log(`✅ Migration ${migrationName} resolved successfully`);
  } catch (error) {
    console.error(`❌ Error resolving migration:`, error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

const migrationName = process.argv[2];
if (!migrationName) {
  console.error('Usage: node scripts/resolve-migration.js <migration-name>');
  process.exit(1);
}

resolveMigration(migrationName);

