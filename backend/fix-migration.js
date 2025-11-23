const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixMigration() {
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    try {
      console.log(`Попытка ${attempts + 1}/${maxAttempts}...`);
      
      // Пробуем подключиться
      await prisma.$queryRaw`SELECT 1`;
      console.log('✅ База данных доступна');
      
      // Удаляем запись о failed миграции
      await prisma.$queryRaw`
        DELETE FROM "_prisma_migrations" 
        WHERE migration_name = '20251126000000_add_project_types'
      `;
      console.log('✅ Запись о failed миграции удалена');
      
      await prisma.$disconnect();
      console.log('✅ Готово! Теперь можно применить миграции: npx prisma migrate deploy');
      process.exit(0);
    } catch (error) {
      attempts++;
      if (attempts >= maxAttempts) {
        console.error('❌ Не удалось подключиться после', maxAttempts, 'попыток');
        console.error('Ошибка:', error.message);
        await prisma.$disconnect();
        process.exit(1);
      }
      console.log('⏳ База данных спит, ждем 5 секунд...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

fixMigration();

