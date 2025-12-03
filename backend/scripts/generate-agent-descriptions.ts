import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function generateDescriptions() {
  try {
    const agents = await (prisma as any).projectTypeAgent.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        systemInstruction: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    console.log(`\nНайдено агентов: ${agents.length}\n`);
    console.log('='.repeat(80));
    
    for (const agent of agents) {
      console.log(`\nАгент: ${agent.name}`);
      console.log(`ID: ${agent.id}`);
      console.log(`Текущее описание: ${agent.description || '(пусто)'}`);
      console.log(`Промпт (первые 200 символов): ${agent.systemInstruction?.substring(0, 200) || '(пусто)'}...`);
      console.log('-'.repeat(80));
    }
    
    await prisma.$disconnect();
  } catch (error: any) {
    console.error('Ошибка:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

generateDescriptions();
