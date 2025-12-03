import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../db/prisma';
import { logger } from '../utils/logger';

const SHOP_ID = process.env.YOOKASSA_SHOP_ID;
const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;

if (!SHOP_ID || !SECRET_KEY) {
    logger.error('Yookassa credentials missing in env vars');
} else {
    logger.info(`Yookassa initialized with Shop ID: ${SHOP_ID}`);
}

const yookassaClient = axios.create({
    baseURL: 'https://api.yookassa.ru/v3',
    auth: {
        username: SHOP_ID || '',
        password: SECRET_KEY || '',
    },
    headers: {
        'Content-Type': 'application/json',
    },
});

export const createPayment = async (userId: string, amount: number | string, description: string, returnUrl: string) => {
    try {
        const idempotenceKey = uuidv4();
        const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

        const response = await yookassaClient.post('/payments', {
            amount: {
                value: numericAmount.toFixed(2),
                currency: 'RUB',
            },
            capture: true,
            confirmation: {
                type: 'redirect',
                return_url: returnUrl,
            },
            description: description,
            metadata: {
                userId: userId,
            },
        }, {
            headers: {
                'Idempotence-Key': idempotenceKey,
            },
        });

        const paymentData = response.data;

        // Save payment to DB
        await prisma.payment.create({
            data: {
                userId,
                amount: numericAmount,
                currency: 'RUB',
                status: paymentData.status,
                yookassaId: paymentData.id,
                description,
            },
        });

        return paymentData;
    } catch (error: any) {
        logger.error({ error: error.response?.data || error.message }, 'Failed to create payment');
        throw new Error('Payment creation failed');
    }
};

export const handleWebhook = async (event: any) => {
    try {
        const { object } = event;
        
        if (!object || !object.id) {
            logger.error({ event }, 'Invalid webhook event: missing object or object.id');
            throw new Error('Invalid webhook event structure');
        }

        const paymentId = object.id;
        const status = object.status;
        const userId = object.metadata?.userId;

        logger.info({ paymentId, status, userId, eventType: event.event }, 'Processing payment webhook');

        // Проверка наличия userId в metadata
        if (!userId) {
            logger.error({ paymentId, status, metadata: object.metadata }, 'Webhook missing userId in metadata');
            throw new Error('UserId not found in payment metadata');
        }

        // Находим платеж в базе данных (может не существовать, если webhook пришел раньше создания платежа)
        const existingPayment = await prisma.payment.findFirst({
            where: { yookassaId: paymentId },
        });

        if (existingPayment) {
            // Обновляем статус существующего платежа
            await prisma.payment.update({
                where: { yookassaId: paymentId },
                data: { status },
            });
            logger.info({ paymentId, status, userId }, 'Payment status updated in DB');
        } else {
            // Платеж не найден - возможно webhook пришел раньше создания платежа
            // Создаем запись о платеже, если есть необходимая информация
            if (object.amount && object.amount.value) {
                try {
                    await prisma.payment.create({
                        data: {
                            userId,
                            amount: parseFloat(object.amount.value),
                            currency: object.amount.currency || 'RUB',
                            status: status,
                            yookassaId: paymentId,
                            description: object.description || 'Payment from webhook',
                        },
                    });
                    logger.info({ paymentId, status, userId }, 'Payment created from webhook');
                } catch (createError: any) {
                    // Если платеж уже существует (race condition), просто логируем
                    if (createError.code === 'P2002') {
                        logger.warn({ paymentId }, 'Payment already exists, skipping creation');
                    } else {
                        logger.error({ paymentId, error: createError }, 'Failed to create payment from webhook');
                        throw createError;
                    }
                }
            } else {
                logger.warn({ paymentId, userId }, 'Payment not found in DB and cannot create from webhook (missing amount)');
            }
        }

        // Обрабатываем успешный платеж
        if (status === 'succeeded') {
            // Проверяем существование пользователя
            const user = await prisma.user.findUnique({
                where: { id: userId },
            });

            if (!user) {
                logger.error({ userId, paymentId }, 'User not found when trying to activate subscription');
                throw new Error(`User with id ${userId} not found`);
            }

            // Проверяем, не активирована ли уже подписка (идемпотентность)
            // Если подписка уже активна и не истекла, не обновляем
            const now = new Date();
            const isSubscriptionActive = user.isPaid && 
                user.subscriptionExpiresAt && 
                new Date(user.subscriptionExpiresAt) > now;

            if (isSubscriptionActive) {
                logger.info({ userId, paymentId, expiresAt: user.subscriptionExpiresAt }, 'Subscription already active, skipping activation');
                return;
            }

            // Активируем подписку на 30 дней
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);

            await prisma.user.update({
                where: { id: userId },
                data: {
                    isPaid: true,
                    subscriptionExpiresAt: expiresAt,
                },
            });

            logger.info({ userId, paymentId, expiresAt }, 'Subscription activated successfully');
        } else if (status === 'canceled') {
            logger.info({ paymentId, userId }, 'Payment canceled');
        } else {
            logger.info({ paymentId, userId, status }, 'Payment status updated (not succeeded)');
        }
    } catch (error: any) {
        logger.error({ 
            error: error.message, 
            stack: error.stack, 
            event: JSON.stringify(event, null, 2) 
        }, 'Error processing payment webhook');
        throw error;
    }
};
