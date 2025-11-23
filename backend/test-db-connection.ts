import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Загружаем .env
dotenv.config({ path: path.join(__dirname, '.env') });

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔌 Testing PostgreSQL connection...');
    const dbUrl = process.env.DATABASE_URL || 'NOT SET';
    console.log('DATABASE_URL:', dbUrl.replace(/:[^:@]+@/, ':****@'));
    
    // Простой запрос для проверки подключения
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database connection successful!');
    
    // Проверяем, есть ли таблицы
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;
    
    console.log(`📊 Found ${tables.length} tables in database:`);
    if (tables.length === 0) {
      console.log('  (No tables found - database is empty)');
    } else {
      tables.forEach(table => {
        console.log(`  - ${table.tablename}`);
      });
    }
    
    // Проверяем версию PostgreSQL
    const version = await prisma.$queryRaw<Array<{ version: string }>>`
      SELECT version()
    `;
    if (version.length > 0) {
      console.log(`\n🐘 PostgreSQL version: ${version[0].version.split(' ')[0]} ${version[0].version.split(' ')[1]}`);
    }
    
  } catch (error: any) {
    console.error('❌ Database connection failed:');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    if (error.meta) {
      console.error('Error meta:', error.meta);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();

