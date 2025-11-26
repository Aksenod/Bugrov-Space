import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';

type TemplateConnection = {
  order: number | null;
  projectTypeAgent: any;
};

const loadTemplateConnections = async (projectTypeId: string) => {
  const connections = await (prisma as any).projectTypeAgentProjectType.findMany({
    where: { projectTypeId },
    include: {
      projectTypeAgent: true,
    },
    orderBy: [
      { order: 'asc' },
      { createdAt: 'asc' },
    ],
  });
  return connections as TemplateConnection[];
};

const loadTemplateKnowledgeBase = async (templateAgentIds: string[]) => {
  if (templateAgentIds.length === 0) {
    return new Map<string, any[]>();
  }

  const files = await (prisma as any).file.findMany({
    where: {
      projectTypeAgentId: { in: templateAgentIds },
      isKnowledgeBase: true,
      name: {
        not: {
          startsWith: 'Summary',
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return (files as any[]).reduce((map, file) => {
    if (!file.projectTypeAgentId) {
      return map;
    }
    if (!map.has(file.projectTypeAgentId)) {
      map.set(file.projectTypeAgentId, []);
    }
    map.get(file.projectTypeAgentId)!.push(file);
    return map;
  }, new Map<string, any[]>());
};

type PrismaExecutor = Prisma.TransactionClient | typeof prisma;

const cloneKnowledgeBase = async (
  templateId: string,
  agentId: string,
  templateKnowledgeMap: Map<string, any[]>,
  tx: PrismaExecutor = prisma
) => {
  const files = templateKnowledgeMap.get(templateId) ?? [];
  if (files.length === 0) {
    return;
  }

  await tx.file.createMany({
    data: files.map((file) => ({
      agentId,
      name: file.name,
      mimeType: file.mimeType,
      content: file.content,
      isKnowledgeBase: true,
    })),
  });
};

const syncProjectAgents = async (
  projectId: string,
  userId: string,
  connections: TemplateConnection[],
  templateKnowledgeMap: Map<string, any[]>,
  templateAgentIds: string[]
) => {
  await prisma.$transaction(async (tx) => {
    const existingAgents = await (tx as any).agent.findMany({
      where: { projectId },
      select: {
        id: true,
        projectTypeAgentId: true,
        name: true,
      },
    });

    const existingByTemplate = new Map<string, { id: string }>();
    const existingByName = new Map<string, { id: string }>();
    existingAgents.forEach((agent: any) => {
      if (agent.projectTypeAgentId) {
        existingByTemplate.set(agent.projectTypeAgentId, { id: agent.id });
      } else if (agent.name) {
        existingByName.set(agent.name, { id: agent.id });
      }
    });

    for (const [index, connection] of connections.entries()) {
      const template = connection.projectTypeAgent;
      if (!template) continue;
      const desiredOrder = typeof connection.order === 'number' ? connection.order : index;

      let existing = existingByTemplate.get(template.id);
      if (!existing && template.name && existingByName.has(template.name)) {
        existing = existingByName.get(template.name);
        existingByName.delete(template.name);
      }
      if (existing) {
        await (tx as any).agent.update({
          where: { id: existing.id },
          data: {
            name: template.name,
            description: template.description ?? '',
            systemInstruction: template.systemInstruction ?? '',
            summaryInstruction: template.summaryInstruction ?? '',
            model: template.model ?? 'gpt-5.1',
            role: template.role ?? '',
            order: desiredOrder,
            projectTypeAgentId: template.id,
          },
        });

        await tx.file.deleteMany({
          where: { agentId: existing.id, isKnowledgeBase: true },
        });
        await cloneKnowledgeBase(template.id, existing.id, templateKnowledgeMap, tx);
      } else {
        const newAgent = await (tx as any).agent.create({
          data: {
            userId,
            projectId,
            projectTypeAgentId: template.id,
            name: template.name,
            description: template.description ?? '',
            systemInstruction: template.systemInstruction ?? '',
            summaryInstruction: template.summaryInstruction ?? '',
            model: template.model ?? 'gpt-5.1',
            role: template.role ?? '',
            order: desiredOrder,
          },
        });
        await cloneKnowledgeBase(template.id, newAgent.id, templateKnowledgeMap, tx);
      }
    }

    if (templateAgentIds.length > 0) {
      await (tx as any).agent.deleteMany({
        where: {
          projectId,
          projectTypeAgentId: {
            notIn: templateAgentIds,
            not: null,
          },
        },
      });
    }
  });
};

export const syncProjectTypeAgents = async (projectTypeId: string) => {
  try {
    const connections = await loadTemplateConnections(projectTypeId);
    if (connections.length === 0) {
      logger.info({ projectTypeId }, 'No template agents to sync for project type');
      return;
    }

    const templateAgentIds = connections
      .map((connection) => connection.projectTypeAgent?.id)
      .filter((id): id is string => Boolean(id));

    const templateKnowledge = await loadTemplateKnowledgeBase(templateAgentIds);

    const projects = await prisma.project.findMany({
      where: { projectTypeId },
      select: {
        id: true,
        userId: true,
      },
    });

    for (const project of projects) {
      await syncProjectAgents(
        project.id,
        project.userId,
        connections,
        templateKnowledge,
        templateAgentIds
      );
    }

    logger.info({ projectTypeId, projectsCount: projects.length }, 'Project type agents synchronized');
  } catch (error: any) {
    logger.error(
      { projectTypeId, error: error.message, stack: error.stack },
      'Failed to synchronize project type agents'
    );
    throw error;
  }
};

export const syncProjectTypesForTemplate = async (projectTypeAgentId: string) => {
  const connections = await (prisma as any).projectTypeAgentProjectType.findMany({
    where: { projectTypeAgentId },
    select: { projectTypeId: true },
  });

  const projectTypeIds: string[] = Array.from(
    new Set(
      connections
        .map((connection: { projectTypeId?: string }) => connection.projectTypeId)
        .filter((id: string | undefined): id is string => Boolean(id))
    )
  );

  for (const projectTypeId of projectTypeIds) {
    await syncProjectTypeAgents(projectTypeId);
  }
};

export const syncProjectAgentsForProject = async (projectId: string) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        userId: true,
        projectTypeId: true,
      },
    });

    if (!project || !project.projectTypeId) {
      logger.warn({ projectId }, 'Project not found or has no projectTypeId for sync');
      return;
    }

    const connections = await loadTemplateConnections(project.projectTypeId);
    if (connections.length === 0) {
      logger.debug({ projectId }, 'No template agents for project type during per-project sync');
      return;
    }

    const templateAgentIds = connections
      .map((connection) => connection.projectTypeAgent?.id)
      .filter((id): id is string => Boolean(id));

    const templateKnowledge = await loadTemplateKnowledgeBase(templateAgentIds);

    await syncProjectAgents(
      project.id,
      project.userId,
      connections,
      templateKnowledge,
      templateAgentIds
    );

    logger.info({ projectId }, 'Project agents synchronized from templates');
  } catch (error: any) {
    logger.error(
      { projectId, error: error.message, stack: error.stack },
      'Failed to synchronize project agents for project'
    );
    throw error;
  }
};

