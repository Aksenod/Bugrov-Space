import express from 'express';
import { createPayment, handleWebhook } from '../services/paymentService';
import { logger } from '../utils/logger';
import { authMiddleware as authenticate } from '../middleware/authMiddleware';

const router = express.Router();

// Create payment
router.post('/create', authenticate, async (req: any, res) => {
    try {
        const userId = req.userId; // authMiddleware sets userId directly on req
        const { amount = 1.00, description = 'Subscription Payment' } = req.body; // Default 1 RUB for testing

        // Return URL should be the frontend page where user lands after payment
        // Using production URL (бэкенд работает только на Render, не на localhost)
        const returnUrl = req.body.returnUrl || 'https://bugrov.space';

        const payment = await createPayment(userId, amount, description, returnUrl);

        res.json({
            confirmationUrl: payment.confirmation.confirmation_url,
        });
    } catch (error: any) {
        logger.error({ err: error }, 'Error creating payment endpoint');
        res.status(500).json({ error: 'Failed to create payment' });
    }
});

// Webhook handler
router.post('/webhook', async (req, res) => {
    try {
        const event = req.body;

        // Логируем входящий webhook для отладки
        logger.info({ 
            eventType: event?.event, 
            paymentId: event?.object?.id,
            hasBody: !!req.body,
            contentType: req.headers['content-type']
        }, 'Received webhook request');

        // Проверка структуры event
        if (!event || typeof event !== 'object') {
            logger.error({ body: req.body }, 'Invalid webhook: event is not an object');
            return res.status(400).json({ error: 'Invalid webhook structure: event must be an object' });
        }

        if (!event.event) {
            logger.error({ event }, 'Invalid webhook: missing event type');
            return res.status(400).json({ error: 'Invalid webhook structure: missing event type' });
        }

        if (!event.object || typeof event.object !== 'object') {
            logger.error({ event }, 'Invalid webhook: missing or invalid object');
            return res.status(400).json({ error: 'Invalid webhook structure: missing or invalid object' });
        }

        // Обрабатываем только нужные типы событий
        const supportedEvents = ['payment.succeeded', 'payment.canceled', 'payment.waiting_for_capture'];
        if (!supportedEvents.includes(event.event)) {
            logger.info({ eventType: event.event }, 'Webhook event type not supported, ignoring');
            return res.status(200).send('OK');
        }

        // Обрабатываем webhook
        await handleWebhook(event);

        logger.info({ eventType: event.event, paymentId: event.object?.id }, 'Webhook processed successfully');
        res.status(200).send('OK');
    } catch (error: any) {
        // Детальное логирование ошибки
        const errorDetails = {
            message: error?.message || 'Unknown error',
            stack: error?.stack,
            name: error?.name,
            code: error?.code,
            event: req.body ? JSON.stringify(req.body, null, 2) : 'No body',
        };

        logger.error(errorDetails, 'Webhook processing error');

        // Определяем тип ошибки для правильной обработки
        // Валидационные ошибки (неправильная структура webhook) - не повторяем
        // Ошибки обработки (база данных, отсутствие пользователя и т.д.) - повторяем
        const isValidationError = error?.message?.includes('Invalid webhook') || 
                                  error?.message?.includes('Invalid webhook event structure') ||
                                  error?.message?.includes('missing event type') ||
                                  error?.message?.includes('missing or invalid object');
        
        // Для валидационных ошибок возвращаем 400 - YooKassa не будет повторять отправку
        if (isValidationError) {
            logger.warn({ error: errorDetails }, 'Webhook validation error, returning 400');
            return res.status(400).json({ error: 'Invalid webhook data' });
        }

        // Для всех остальных ошибок (база данных, отсутствие пользователя, race conditions и т.д.)
        // возвращаем 500, чтобы YooKassa повторил отправку
        // Это важно для случаев, когда платеж обработан, но подписка не активирована
        logger.error({ error: errorDetails }, 'Webhook processing failed, returning 500 for retry');
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

export default router;
