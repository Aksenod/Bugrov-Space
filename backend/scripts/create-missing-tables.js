#!/usr/bin/env node
/**
 * Скрипт для создания отсутствующих таблиц в продакшене
 * Использование: node scripts/create-missing-tables.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createMissingTables() {
  try {
    console.log('Checking for missing tables...');
    
    // Проверяем существование таблиц
    const tables = await prisma.$queryRawUnsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('ProjectTypeAgent', 'ProjectTypeAgentProjectType')
    `);
    
    const existingTables = tables.map(t => t.table_name);
    console.log('Existing tables:', existingTables);
    
    // Создаем ProjectTypeAgent, если не существует
    if (!existingTables.includes('ProjectTypeAgent')) {
      console.log('Creating ProjectTypeAgent table...');
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "ProjectTypeAgent" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "description" TEXT NOT NULL DEFAULT '',
          "systemInstruction" TEXT NOT NULL DEFAULT '',
          "summaryInstruction" TEXT NOT NULL DEFAULT '',
          "model" TEXT NOT NULL DEFAULT 'gpt-5.1',
          "role" TEXT DEFAULT '',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "ProjectTypeAgent_name_idx" ON "ProjectTypeAgent"("name")
      `);
      
      console.log('✅ ProjectTypeAgent table created');
    } else {
      console.log('✓ ProjectTypeAgent table already exists');
    }
    
    // Создаем ProjectTypeAgentProjectType, если не существует
    if (!existingTables.includes('ProjectTypeAgentProjectType')) {
      console.log('Creating ProjectTypeAgentProjectType table...');
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "ProjectTypeAgentProjectType" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "projectTypeAgentId" TEXT NOT NULL,
          "projectTypeId" TEXT NOT NULL,
          "order" INTEGER NOT NULL DEFAULT 0,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "ProjectTypeAgentProjectType_projectTypeAgentId_fkey" 
            FOREIGN KEY ("projectTypeAgentId") 
            REFERENCES "ProjectTypeAgent" ("id") 
            ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "ProjectTypeAgentProjectType_projectTypeId_fkey" 
            FOREIGN KEY ("projectTypeId") 
            REFERENCES "ProjectType" ("id") 
            ON DELETE CASCADE ON UPDATE CASCADE
        )
      `);
      
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "ProjectTypeAgentProjectType_projectTypeAgentId_idx" 
        ON "ProjectTypeAgentProjectType"("projectTypeAgentId")
      `);
      
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "ProjectTypeAgentProjectType_projectTypeId_idx" 
        ON "ProjectTypeAgentProjectType"("projectTypeId")
      `);
      
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "ProjectTypeAgentProjectType_projectTypeAgentId_projectTypeId_key" 
        ON "ProjectTypeAgentProjectType"("projectTypeAgentId", "projectTypeId")
      `);
      
      console.log('✅ ProjectTypeAgentProjectType table created');
    } else {
      console.log('✓ ProjectTypeAgentProjectType table already exists');
    }
    
    console.log('✅ All tables checked/created successfully');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createMissingTables();






