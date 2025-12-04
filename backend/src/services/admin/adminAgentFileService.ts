import { prisma } from '../../db/prisma';
import { withRetry } from '../../utils/prismaRetry';
import { logger } from '../../utils/logger';
import { checkColumnExists } from '../../utils/admin/prismaHelpers';
import { syncProjectTypesForTemplate } from '../projectTypeSync';

/**
 * Загрузить файл для агента-шаблона
 */
export const uploadAgentFile = async (
  agentId: string,
  data: {
    name: string;
    mimeType: string;
    content: string;
    isKnowledgeBase?: boolean;
  }
) => {
  logger.debug({ 
    agentId, 
    fileName: data.name,
    fileSize: data.content.length,
    isKnowledgeBase: data.isKnowledgeBase ?? false
  }, 'Attempting to create file for ProjectTypeAgent');

  // Проверяем, что поле projectTypeAgentId доступно
  const columnExists = await checkColumnExists('File', 'projectTypeAgentId');
  if (!columnExists) {
    logger.error({ agentId }, 'Column projectTypeAgentId does not exist in File table - migration may not be applied');
    throw new Error('Ошибка базы данных: поле projectTypeAgentId не найдено в таблице File. Миграция базы данных не применена. Обратитесь к администратору.');
  }

  const file = await withRetry(
    () => prisma.file.create({
      data: {
        projectTypeAgentId: agentId,
        agentId: null,
        name: data.name,
        mimeType: data.mimeType,
        content: data.content,
        isKnowledgeBase: data.isKnowledgeBase ?? false,
      },
    }),
    3,
    `uploadAgentFile - create file for ${agentId}`
  );

  // Проверяем, что файл действительно создан
  const verifyFile = await withRetry(
    () => prisma.file.findUnique({
      where: { id: file.id },
      select: {
        id: true,
        agentId: true,
        projectTypeAgentId: true,
        name: true,
      },
    }),
    3,
    `uploadAgentFile - verify file ${file.id}`
  );

  if (!verifyFile) {
    logger.error({ fileId: file.id }, 'File was not created in database after create operation');
    throw new Error('Не удалось создать файл. Файл не найден после создания.');
  }

  logger.info({ 
    fileId: file.id, 
    fileName: file.name, 
    projectTypeAgentId: file.projectTypeAgentId,
    verified: true
  }, 'File created and verified for ProjectTypeAgent');

  await syncProjectTypesForTemplate(agentId);

  return file;
};

/**
 * Получить файлы агента-шаблона
 */
export const getAgentFiles = async (agentId: string) => {
  const columnExists = await checkColumnExists('File', 'projectTypeAgentId');
  
  if (!columnExists) {
    logger.warn({ agentId }, 'Column projectTypeAgentId does not exist in File table - migration not applied');
    return [];
  }

  const files = await withRetry(
    () => prisma.file.findMany({
      where: {
        projectTypeAgentId: agentId,
        isKnowledgeBase: true,
        name: {
          not: {
            startsWith: 'Summary'
          }
        }
      },
      select: {
        id: true,
        agentId: true,
        projectTypeAgentId: true,
        name: true,
        mimeType: true,
        content: true,
        isKnowledgeBase: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    3,
    `getAgentFiles - ${agentId}`
  );

  logger.debug({ agentId, filesCount: files.length }, 'Files fetched for ProjectTypeAgent template');

  return files;
};

/**
 * Удалить файл агента-шаблона
 */
export const deleteAgentFile = async (agentId: string, fileId: string) => {
  // Проверяем, что файл существует и принадлежит этому агенту-шаблону
  const file = await withRetry(
    () => prisma.file.findFirst({
      where: {
        id: fileId,
        projectTypeAgentId: agentId,
      },
    }),
    3,
    `deleteAgentFile - find file ${fileId}`
  );

  if (!file) {
    throw new Error('Файл не найден');
  }

  // Удаляем файл
  await withRetry(
    () => prisma.file.delete({
      where: { id: fileId },
    }),
    3,
    `deleteAgentFile - delete file ${fileId}`
  );

  logger.info({ agentId, fileId }, 'File deleted for ProjectTypeAgent');
  await syncProjectTypesForTemplate(agentId);
};

