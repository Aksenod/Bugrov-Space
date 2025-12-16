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

/**
 * Сгенерировать обновленную секцию HTML
 */
export const generateSectionEdit = async (
  verstkaAgent: any,
  sectionHtml: string,
  editPrompt: string,
  projectInfo?: { name: string | null; description: string | null; projectTypeName: string | null }
): Promise<string> => {
  logger.info({ verstkaAgentId: verstkaAgent.id, editPrompt }, 'Generating section edit');

  const verstkaAgentWithFiles = { ...verstkaAgent, files: [] };

  // Формируем специальный промпт для редактирования секции
  const editInstruction = `ЗАДАЧА: Отредактировать HTML секцию согласно инструкции пользователя.

ТЕКУЩИЙ HTML СЕКЦИИ:
${sectionHtml}

ИНСТРУКЦИЯ ПОЛЬЗОВАТЕЛЯ:
${editPrompt}

ТРЕБОВАНИЯ:
1. Верни ТОЛЬКО обновленный HTML контент секции (innerHTML), без внешнего тега.
2. Сохрани общую структуру и стилизацию.
3. Внеси изменения согласно инструкции пользователя.
4. Не добавляй комментарии или объяснения, только чистый HTML.
5. Сохрани все существующие классы и атрибуты, если инструкция не требует их изменения.`;

  const newSectionHtml = await generateDocumentResult(
    verstkaAgentWithFiles,
    editInstruction,
    'verstka',
    projectInfo
  );

  return newSectionHtml;
};

/**
 * Заменить секцию в полном HTML по data-section-id
 */
export const replaceSectionInHtml = (
  fullHtml: string,
  sectionId: string,
  newInnerHtml: string
): string => {
  // Ищем элемент с data-section-id и заменяем его содержимое
  // Используем регулярное выражение для поиска и замены
  const regex = new RegExp(
    `(<[^>]+data-section-id=["']${sectionId}["'][^>]*>)([\\s\\S]*?)(<\\/[^>]+>)`,
    'i'
  );

  const match = fullHtml.match(regex);
  if (!match) {
    logger.warn({ sectionId }, 'Section not found in HTML');
    return fullHtml;
  }

  // Заменяем содержимое секции
  return fullHtml.replace(regex, `$1${newInnerHtml}$3`);
};

