import { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { withRetry } from '../../utils/prismaRetry';
import { logger } from '../../utils/logger';

/**
 * Клонировать базу знаний шаблона в агента
 */
export const cloneTemplateKnowledgeBase = async (templateId: string, agentId: string): Promise<void> => {
  const files = await withRetry(
    () => prisma.file.findMany({
      where: {
        projectTypeAgentId: templateId,
        isKnowledgeBase: true,
        name: {
          not: {
            startsWith: 'Summary',
          },
        },
      } as Prisma.FileWhereInput & { projectTypeAgentId?: string | null },
      orderBy: { createdAt: 'asc' },
    }),
    3,
    `cloneTemplateKnowledgeBase - load files for ${templateId}`
  );

  if (files.length === 0) {
    return;
  }

  await withRetry(
    () => prisma.file.createMany({
      data: files.map((file) => ({
        agentId,
        name: file.name,
        mimeType: file.mimeType,
        content: file.content,
        isKnowledgeBase: true,
      })),
    }),
    3,
    `cloneTemplateKnowledgeBase - copy files for ${agentId}`
  );
};

/**
 * Загрузить базу знаний агента
 */
export const loadAgentKnowledgeBase = async (agentId: string) => {
  return await withRetry(
    () => prisma.file.findMany({
      where: {
        agentId: agentId,
        isKnowledgeBase: true,
        name: {
          not: {
            startsWith: 'Summary'
          }
        }
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
    `loadAgentKnowledgeBase - ${agentId}`
  );
};

/**
 * Загрузить базу знаний шаблона ProjectTypeAgent
 */
export const loadTemplateKnowledgeBase = async (templateId: string) => {
  try {
    return await withRetry(
      () => prisma.file.findMany({
        where: {
          projectTypeAgentId: templateId,
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
      } as any),
      3,
      `loadTemplateKnowledgeBase - ${templateId}`
    );
  } catch (error: any) {
    logger.warn({
      templateId,
      error: error.message
    }, 'Failed to load template knowledge base');
    return [];
  }
};

