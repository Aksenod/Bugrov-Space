import { prisma } from '../../db/prisma';
import { withRetry } from '../../utils/prismaRetry';
import { logger } from '../../utils/logger';
import { generateDocumentResult, decodeBase64ToText } from '../openaiService';

/**
 * Найти агента по роли в проекте
 */
export const findAgentByRole = (projectAgents: any[], roleName: string) => {
  const found = projectAgents.find(a => {
    const roles = (a.role || '').split(',').map((r: string) => r.trim().toLowerCase());
    const hasRole = roles.includes(roleName.toLowerCase());

    logger.info({
      agentId: a.id,
      agentName: a.name,
      agentRole: a.role,
      parsedRoles: roles,
      searchingFor: roleName.toLowerCase(),
      hasRole
    }, `Checking agent for role ${roleName}`);

    return hasRole;
  });

  logger.info({
    roleName,
    found: !!found,
    foundAgentId: found?.id,
    foundAgentName: found?.name,
    totalProjectAgents: projectAgents.length,
    allAgentRoles: projectAgents.map(a => ({ id: a.id, name: a.name, role: a.role }))
  }, `Find agent by role ${roleName} result`);

  return found;
};

/**
 * Найти DSL агента в проекте
 */
export const findDSLAgent = (projectAgents: any[]) => {
  return findAgentByRole(projectAgents, 'dsl');
};

/**
 * Найти Verstka (layout) агента в проекте
 */
export const findVerstkaAgent = (projectAgents: any[]) => {
  return findAgentByRole(projectAgents, 'layout');
};

/**
 * Сгенерировать DSL контент
 */
export const generateDSL = async (
  dslAgent: any,
  fileContent: string,
  projectInfo?: { name: string | null; description: string | null; projectTypeName: string | null }
): Promise<string> => {
  logger.info({ fileId: dslAgent.id, dslAgentId: dslAgent.id }, 'Generating DSL content');

  const dslAgentWithFiles = { ...dslAgent, files: [] };

  const dslContent = await generateDocumentResult(
    dslAgentWithFiles,
    fileContent,
    'dsl',
    projectInfo
  );

  return dslContent;
};

/**
 * Сгенерировать HTML (Verstka) контент
 */
export const generateHTML = async (
  verstkaAgent: any,
  dslContent: string,
  projectInfo?: { name: string | null; description: string | null; projectTypeName: string | null }
): Promise<string> => {
  logger.info({ verstkaAgentId: verstkaAgent.id }, 'Generating Verstka content');

  const verstkaAgentWithFiles = { ...verstkaAgent, files: [] };

  const verstkaContent = await generateDocumentResult(
    verstkaAgentWithFiles,
    dslContent,
    'verstka',
    projectInfo
  );

  return verstkaContent;
};

/**
 * Получить следующий номер версии прототипа
 */
export const getNextPrototypeVersion = async (fileId: string): Promise<number> => {
  const existingVersions = await withRetry(
    () => prisma.prototypeVersion.findMany({
      where: { fileId },
      orderBy: { versionNumber: 'desc' },
      take: 1,
      select: { versionNumber: true }
    }),
    3,
    `getNextPrototypeVersion - ${fileId}`
  );

  return existingVersions.length > 0 
    ? existingVersions[0].versionNumber + 1 
    : 1;
};

/**
 * Ограничить количество версий прототипа (удалить старые)
 */
export const limitPrototypeVersions = async (fileId: string, maxVersions: number = 10): Promise<void> => {
  const allVersions = await prisma.prototypeVersion.findMany({
    where: { fileId },
    orderBy: { versionNumber: 'desc' },
    select: { id: true, versionNumber: true }
  });

  if (allVersions.length > maxVersions) {
    const versionsToDelete = allVersions.slice(maxVersions);
    await prisma.prototypeVersion.deleteMany({
      where: {
        fileId,
        versionNumber: {
          in: versionsToDelete.map(v => v.versionNumber)
        }
      }
    });
    logger.info({ 
      fileId, 
      deletedVersions: versionsToDelete.length,
      remainingVersions: maxVersions 
    }, 'Deleted old prototype versions');
  }
};

