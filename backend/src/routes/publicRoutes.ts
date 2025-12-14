import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';
import { withRetry } from '../utils/prismaRetry';

const router = Router();

// GET /api/public/prototype/:documentId - получить прототип без авторизации
// Поддерживает query параметр ?v=versionNumber для выбора конкретной версии
router.get('/prototype/:documentId', asyncHandler(async (req: Request, res: Response) => {
    const { documentId } = req.params;
    const versionParam = req.query.v as string | undefined;
    const versionNumber = versionParam ? parseInt(versionParam, 10) : null;

    logger.info({ documentId, versionNumber }, 'Public prototype request');

    // Загружаем документ
    const file = await withRetry(
        () => prisma.file.findUnique({
            where: { id: documentId },
            select: {
                id: true,
                name: true,
                verstkaContent: true,
                dslContent: true,
                agent: {
                    select: {
                        id: true,
                        name: true,
                        project: {
                            select: {
                                id: true,
                                name: true,
                                user: {
                                    select: {
                                        id: true,
                                        username: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        }),
        3,
        `GET /public/prototype/${documentId}`
    );

    if (!file) {
        logger.warn({ documentId }, 'Document not found for public prototype');
        return res.status(404).json({ error: 'Прототип не найден' });
    }

    let verstkaContent: string | null = null;
    let dslContent: string | null = null;

    // Если указана версия, загружаем её из PrototypeVersion
    if (versionNumber !== null && !isNaN(versionNumber)) {
        const version = await withRetry(
            () => prisma.prototypeVersion.findUnique({
                where: {
                    fileId_versionNumber: {
                        fileId: documentId,
                        versionNumber: versionNumber
                    }
                },
                select: {
                    verstkaContent: true,
                    dslContent: true
                }
            }),
            3,
            `GET /public/prototype/${documentId} - find version ${versionNumber}`
        );

        if (!version) {
            logger.warn({ documentId, versionNumber }, 'Prototype version not found');
            return res.status(404).json({ error: `Версия ${versionNumber} не найдена` });
        }

        verstkaContent = version.verstkaContent;
        dslContent = version.dslContent;
    } else {
        // Используем данные из File (последняя версия или старые данные для обратной совместимости)
        verstkaContent = file.verstkaContent;
        dslContent = file.dslContent;
    }

    // Проверяем наличие контента прототипа
    if (!verstkaContent) {
        logger.warn({ documentId, versionNumber }, 'Document has no prototype content');
        return res.status(404).json({ error: 'Прототип еще не сгенерирован для этого документа' });
    }

    logger.debug({
        documentId,
        versionNumber,
        fileName: file.name,
        hasVerstkaContent: !!verstkaContent,
        hasDslContent: !!dslContent,
    }, 'Public prototype loaded successfully');

    // Возвращаем только публичную информацию
    res.json({
        prototype: {
            id: file.id,
            name: file.name,
            html: verstkaContent,
            dsl: dslContent,
            versionNumber: versionNumber || undefined,
            project: file.agent?.project ? {
                id: file.agent.project.id,
                name: file.agent.project.name,
            } : null,
            username: file.agent?.project?.user?.username || null,
        },
    });
}));

// GET /api/public/agents - получить все уникальные агенты для витрины (без авторизации)
router.get('/agents', asyncHandler(async (req: Request, res: Response) => {
    logger.info('Public agents request');

    try {
        // Загружаем все агенты-шаблоны
        const allAgents = await withRetry(
            () => prisma.projectTypeAgent.findMany({
                where: {
                    isHiddenFromSidebar: false, // Показываем только видимые агенты
                },
                select: {
                    id: true,
                    name: true,
                    description: true,
                    role: true,
                    createdAt: true,
                },
                orderBy: {
                    createdAt: 'asc',
                },
            }),
            3,
            'GET /public/agents - find agents'
        );

        logger.debug({ totalAgents: allAgents.length }, 'Loaded agents from database');

        // Убираем дубликаты по имени, оставляя первый (самый старый) агент с таким именем
        const uniqueAgentsMap = new Map<string, typeof allAgents[0]>();
        for (const agent of allAgents) {
            if (agent.name && !uniqueAgentsMap.has(agent.name)) {
                uniqueAgentsMap.set(agent.name, agent);
            }
        }

        const agents = Array.from(uniqueAgentsMap.values())
            .filter(agent => agent.name) // Фильтруем только агентов с именем (description может быть пустым)
            .sort((a, b) => a.name.localeCompare(b.name)); // Сортируем по алфавиту

        logger.debug({ agentsCount: agents.length, totalAgents: allAgents.length }, 'Public agents loaded successfully');

        // Возвращаем только публичную информацию
        res.json({
            agents: agents.map(agent => ({
                id: agent.id,
                name: agent.name,
                description: agent.description || '',
                role: agent.role || '',
            })),
        });
    } catch (error: any) {
        logger.error({ error: error.message, code: error.code, stack: error.stack }, 'Error loading public agents');
        // Если таблица не существует (миграция не применена), возвращаем пустой массив
        if (error.code === 'P2001' || error.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('Unknown model')) {
            logger.warn('ProjectTypeAgent table may not exist, returning empty array');
            return res.json({ agents: [] });
        }
        throw error;
    }
}));

// GET /api/public/project-types - получить типы проектов с их агентами (без авторизации)
router.get('/project-types', asyncHandler(async (req: Request, res: Response) => {
    logger.info('Public project types request');

    try {
        // Загружаем только публичные типы проектов (исключаем isAdminOnly: true)
        const projectTypes = await withRetry(
            () => prisma.projectType.findMany({
                where: { isAdminOnly: false },
                orderBy: { name: 'asc' },
                select: {
                    id: true,
                    name: true,
                },
            }),
            3,
            'GET /public/project-types - find project types'
        );

        // Для каждого типа проекта загружаем его агентов через промежуточную таблицу
        const projectTypesWithAgents = await Promise.all(
            projectTypes.map(async (projectType) => {
                try {
                    const agentConnections = await withRetry(
                        () => (prisma as any).projectTypeAgentProjectType.findMany({
                            where: { projectTypeId: projectType.id },
                            include: {
                                projectTypeAgent: {
                                    select: {
                                        id: true,
                                        name: true,
                                        description: true,
                                        role: true,
                                        isHiddenFromSidebar: true,
                                    },
                                },
                            },
                            orderBy: [
                                { order: 'asc' },
                                { createdAt: 'asc' },
                            ],
                        }),
                        3,
                        `GET /public/project-types - find agents for ${projectType.id}`
                    ) as any[];

                    // Фильтруем только видимые агенты и преобразуем в формат ответа
                    const agents = agentConnections
                        .map((connection: any) => connection.projectTypeAgent)
                        .filter((agent: any) => !agent.isHiddenFromSidebar && agent.name) // description может быть пустым
                        .map((agent: any) => ({
                            id: agent.id,
                            name: agent.name,
                            description: agent.description || '',
                            role: agent.role || '',
                        }));

                    return {
                        id: projectType.id,
                        name: projectType.name,
                        agents,
                    };
                } catch (error: any) {
                    logger.warn({ projectTypeId: projectType.id, error: error.message }, 'Error loading agents for project type');
                    return {
                        id: projectType.id,
                        name: projectType.name,
                        agents: [],
                    };
                }
            })
        );

        // Фильтруем типы проектов, у которых есть хотя бы один агент
        const filteredProjectTypes = projectTypesWithAgents.filter(pt => pt.agents.length > 0);

        logger.debug({ 
            projectTypesCount: filteredProjectTypes.length, 
            totalProjectTypes: projectTypes.length 
        }, 'Public project types loaded successfully');

        res.json({ projectTypes: filteredProjectTypes });
    } catch (error: any) {
        logger.error({ error: error.message, code: error.code, stack: error.stack }, 'Error loading public project types');
        // Если таблица не существует (миграция не применена), возвращаем пустой массив
        if (error.code === 'P2001' || error.code === 'P2021' || error.message?.includes('does not exist') || error.message?.includes('Unknown model')) {
            logger.warn('ProjectType or ProjectTypeAgentProjectType table may not exist, returning empty array');
            return res.json({ projectTypes: [] });
        }
        throw error;
    }
}));

export default router;
