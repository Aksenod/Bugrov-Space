import { prisma } from '../../db/prisma';
import { withRetry } from '../../utils/prismaRetry';
import { logger } from '../../utils/logger';
import { loadAgentKnowledgeBase, loadTemplateKnowledgeBase } from './knowledgeBaseService';

/**
 * Загрузить файлы базы знаний агента
 */
export const loadAgentFiles = async (agentId: string) => {
  return await loadAgentKnowledgeBase(agentId);
};

/**
 * Загрузить файлы базы знаний шаблона ProjectTypeAgent
 */
export const loadTemplateFiles = async (templateId: string) => {
  return await loadTemplateKnowledgeBase(templateId);
};

/**
 * Загрузить документы проекта (не база знаний)
 */
export const loadProjectFiles = async (agentIds: string[]) => {
  return await withRetry(
    () => prisma.file.findMany({
      where: {
        isKnowledgeBase: false,
        agentId: { in: agentIds },
      },
      select: {
        id: true,
        name: true,
        mimeType: true,
        content: true,
        agentId: true,
        isKnowledgeBase: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    3,
    `loadProjectFiles - agents: ${agentIds.join(', ')}`
  );
};

/**
 * Подготовить все файлы для агента (база знаний + документы проекта)
 */
export const prepareFilesForAgent = async (
  agent: any,
  templateId: string | null,
  projectAgentIds: string[]
): Promise<any[]> => {
  // Загружаем базу знаний агента
  const agentKnowledgeBase = await loadAgentFiles(agent.id);

  // Если агент был создан из шаблона, загружаем базу знаний шаблона
  let templateKnowledgeBase: any[] = [];
  if (templateId && agent.id !== templateId) {
    templateKnowledgeBase = await loadTemplateFiles(templateId);
    logger.debug({
      templateId,
      templateKnowledgeBaseCount: templateKnowledgeBase.length
    }, 'Loaded template knowledge base');
  }

  // Загружаем документы проекта
  const allProjectFiles = await loadProjectFiles(projectAgentIds);

  // Объединяем все файлы
  const allFiles = [
    ...agentKnowledgeBase,
    ...templateKnowledgeBase,
    ...allProjectFiles,
  ];

  logger.debug({
    agentId: agent.id,
    agentName: agent.name,
    agentKnowledgeBaseCount: agentKnowledgeBase.length,
    templateKnowledgeBaseCount: templateKnowledgeBase.length,
    projectFilesCount: allProjectFiles.length,
    totalFilesCount: allFiles.length
  }, 'Prepared all files for agent');

  return allFiles;
};

/**
 * Загрузить файлы для генерации саммари (только документы проекта)
 */
export const loadSummaryFiles = async (agentIds: string[]) => {
  return await withRetry(
    () => prisma.file.findMany({
      where: {
        isKnowledgeBase: false,
        agentId: { in: agentIds },
      },
      select: {
        id: true,
        name: true,
        mimeType: true,
        content: true,
        dslContent: true,
        verstkaContent: true,
        agentId: true,
        isKnowledgeBase: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    3,
    `loadSummaryFiles - agents: ${agentIds.join(', ')}`
  );
};

