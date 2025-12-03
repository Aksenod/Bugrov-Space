import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middleware/errorHandler';
import { withRetry } from '../utils/prismaRetry';

const router = Router();

// GET /api/public/prototype/:documentId - получить прототип без авторизации
router.get('/prototype/:documentId', asyncHandler(async (req: Request, res: Response) => {
    const { documentId } = req.params;

    logger.info({ documentId }, 'Public prototype request');

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

    // Проверяем наличие контента прототипа
    if (!file.verstkaContent) {
        logger.warn({ documentId }, 'Document has no prototype content');
        return res.status(404).json({ error: 'Прототип еще не сгенерирован для этого документа' });
    }

    logger.debug({
        documentId,
        fileName: file.name,
        hasVerstkaContent: !!file.verstkaContent,
        hasDslContent: !!file.dslContent,
    }, 'Public prototype loaded successfully');

    // Возвращаем только публичную информацию
    res.json({
        prototype: {
            id: file.id,
            name: file.name,
            html: file.verstkaContent,
            dsl: file.dslContent,
            project: file.agent?.project ? {
                id: file.agent.project.id,
                name: file.agent.project.name,
            } : null,
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
            .filter(agent => agent.name && agent.description) // Фильтруем агентов с пустыми данными
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

export default router;
