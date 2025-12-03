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
    const { object } = event;
    const paymentId = object.id;
    const status = object.status;
    const userId = object.metadata.userId;

    logger.info({ paymentId, status, userId }, 'Processing payment webhook');

    // Update payment status in DB
    await prisma.payment.update({
        where: { yookassaId: paymentId },
        data: { status },
    });

    if (status === 'succeeded') {
        // Grant subscription
        // For simplicity, let's say subscription is for 30 days
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await prisma.user.update({
            where: { id: userId },
            data: {
                isPaid: true,
                subscriptionExpiresAt: expiresAt,
            },
        });

        logger.info({ userId }, 'Subscription activated');
    } else if (status === 'canceled') {
        // Handle cancellation if needed
        logger.info({ paymentId }, 'Payment canceled');
    }
};
