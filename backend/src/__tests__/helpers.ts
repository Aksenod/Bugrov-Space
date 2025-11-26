import { hashPassword } from '../utils/password';
import { signToken } from '../utils/token';
import { prisma } from './setup';

export async function createTestUser(username?: string, password: string = 'testpass123') {
  const uniqueUsername =
    username ?? `testuser_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      username: uniqueUsername,
      passwordHash,
    },
  });
  return user;
}

export function getAuthToken(userId: string): string {
  return signToken(userId);
}

export async function createTestProject(userId: string, name: string = 'Test Project', description?: string, projectTypeId?: string) {
  // Если projectTypeId не указан, получаем первый доступный тип проекта или создаем дефолтный
  let typeId = projectTypeId;
  if (!typeId) {
    const defaultType = await prisma.projectType.findFirst({
      where: { name: 'По умолчанию' },
    });
    if (defaultType) {
      typeId = defaultType.id;
    } else {
      // Создаем дефолтный тип, если его нет
      const newType = await prisma.projectType.create({
        data: { name: 'По умолчанию' },
      });
      typeId = newType.id;
    }
  }
  
  return prisma.project.create({
    data: {
      userId,
      name,
      description: description || null,
      projectTypeId: typeId,
    },
  });
}

export async function createTestAgent(userId: string, projectId: string, name: string = 'Test Agent') {
  return prisma.agent.create({
    data: {
      userId,
      projectId,
      name,
      description: '',
      systemInstruction: '',
      summaryInstruction: '',
      model: 'gpt-5.1',
      role: '',
      order: 0,
    },
  });
}

export async function createTestProjectTypeAgent(projectTypeId: string, name: string = 'Template Agent', order: number = 0) {
  const template = await prisma.projectTypeAgent.create({
    data: {
      name,
      description: '',
      systemInstruction: '',
      summaryInstruction: '',
      model: 'gpt-5.1',
      role: '',
    },
  });

  await (prisma as any).projectTypeAgentProjectType.create({
    data: {
      projectTypeAgentId: template.id,
      projectTypeId,
      order,
    },
  });

  return template;
}

