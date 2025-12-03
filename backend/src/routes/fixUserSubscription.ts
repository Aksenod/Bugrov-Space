import express from 'express';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';
import { authMiddleware } from '../middleware/authMiddleware';
import { adminMiddleware } from '../middleware/adminMiddleware';

const router = express.Router();

/**
 * Эндпоинт для ручного исправления статуса подписки пользователя
 * Только для администраторов
 */
router.post('/fix-subscription', authMiddleware, adminMiddleware, async (req: any, res) => {
    try {
        const { username } = req.body;

        if (!username) {
            return res.status(400).json({ error: 'Username is required' });
        }

        // Находим пользователя
        const user = await prisma.user.findUnique({
            where: { username },
            include: {
                payments: {
                    orderBy: { createdAt: 'desc' },
                    take: 5,
                },
            },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Проверяем, есть ли успешные платежи
        const successfulPayment = user.payments.find((p: any) => p.status === 'succeeded');

        if (!successfulPayment) {
            return res.status(400).json({
                error: 'No successful payments found for this user',
                payments: user.payments,
            });
        }

        // Устанавливаем подписку на 30 дней от текущей даты
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                isPaid: true,
                subscriptionExpiresAt: expiresAt,
            },
        });

        logger.info({ username, userId: user.id }, 'Subscription manually fixed');

        res.json({
            success: true,
            message: 'Subscription activated successfully',
            user: {
                id: updatedUser.id,
                username: updatedUser.username,
                isPaid: updatedUser.isPaid,
                subscriptionExpiresAt: updatedUser.subscriptionExpiresAt,
            },
            successfulPayment: {
                id: successfulPayment.id,
                amount: successfulPayment.amount.toString(),
                status: successfulPayment.status,
                createdAt: successfulPayment.createdAt,
            },
        });
    } catch (error: any) {
        logger.error({ err: error }, 'Error fixing subscription');
        res.status(500).json({ error: 'Failed to fix subscription' });
    }
});

/**
 * Эндпоинт для проверки статуса пользователя и его платежей
 */
router.get('/check-user/:username', authMiddleware, adminMiddleware, async (req: any, res) => {
    try {
        const { username } = req.params;

        const user = await prisma.user.findUnique({
            where: { username },
            include: {
                payments: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            user: {
                id: user.id,
                username: user.username,
                isPaid: user.isPaid,
                subscriptionExpiresAt: user.subscriptionExpiresAt,
                createdAt: user.createdAt,
            },
            payments: user.payments.map((p: any) => ({
                id: p.id,
                amount: p.amount.toString(),
                currency: p.currency,
                status: p.status,
                yookassaId: p.yookassaId,
                description: p.description,
                createdAt: p.createdAt,
            })),
        });
    } catch (error: any) {
        logger.error({ err: error }, 'Error checking user');
        res.status(500).json({ error: 'Failed to check user' });
    }
});

export default router;
