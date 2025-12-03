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
        // Сначала пробуем загрузить все агенты-шаблоны без фильтра по isHiddenFromSidebar
        // чтобы увидеть, сколько всего агентов в системе
        const allAgentsWithoutFilter = await withRetry(
            () => (prisma as any).projectTypeAgent.findMany({
                select: {
                    id: true,
                    name: true,
                    description: true,
                    role: true,
                    isHiddenFromSidebar: true,
                    createdAt: true,
                },
                orderBy: {
                    createdAt: 'asc',
                },
            }),
            3,
            'GET /public/agents - find all agents'
        ) as any[];

        logger.debug({ totalAgents: allAgentsWithoutFilter.length }, 'Total agents found in database');

        // Фильтруем: показываем агентов, которые НЕ скрыты из сайдбара (или если флаг не установлен)
        // И у которых есть хотя бы имя
        const visibleAgents = allAgentsWithoutFilter.filter(agent => {
            const isVisible = agent.isHiddenFromSidebar !== true;
            const hasName = agent.name && agent.name.trim().length > 0;
            return isVisible && hasName;
        });

        logger.debug({ visibleAgents: visibleAgents.length }, 'Visible agents after filtering');

        // Убираем дубликаты по имени, оставляя первый (самый старый) агент с таким именем
        const uniqueAgentsMap = new Map<string, any>();
        for (const agent of visibleAgents) {
            if (agent.name && !uniqueAgentsMap.has(agent.name)) {
                uniqueAgentsMap.set(agent.name, agent);
            }
        }

        // Фильтруем агентов: требуем наличие имени, описание может быть пустым (но показываем его)
        const agents = Array.from(uniqueAgentsMap.values())
            .filter(agent => agent.name && agent.name.trim().length > 0) // Только имя обязательно
            .sort((a, b) => a.name.localeCompare(b.name)); // Сортируем по алфавиту

        logger.debug({ 
            agentsCount: agents.length, 
            totalAgents: allAgentsWithoutFilter.length,
            visibleAgents: visibleAgents.length,
            uniqueAgents: uniqueAgentsMap.size
        }, 'Public agents processed successfully');

        // Возвращаем только публичную информацию
        // Если описание пустое, используем дефолтное описание или имя
        res.json({
            agents: agents.map(agent => ({
                id: agent.id,
                name: agent.name,
                description: agent.description && agent.description.trim().length > 0 
                    ? agent.description 
                    : `AI-агент ${agent.name} для решения задач в вашем проекте`,
                role: agent.role || '',
            })),
        });
    } catch (error: any) {
        logger.error({ error: error.message, code: error.code, stack: error.stack }, 'Error loading public agents');
        // Если таблица не существует (миграция не применена), возвращаем пустой массив
        if (error.code === 'P2001' || error.message?.includes('does not exist')) {
            logger.warn('ProjectTypeAgent table may not exist, returning empty array');
            return res.json({ agents: [] });
        }
        throw error;
    }
}));

export default router;
