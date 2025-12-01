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

export default router;
