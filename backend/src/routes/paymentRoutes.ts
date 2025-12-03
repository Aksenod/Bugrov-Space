import express from 'express';
import { createPayment, handleWebhook } from '../services/paymentService';
import { logger } from '../utils/logger';
import { authMiddleware as authenticate } from '../middleware/authMiddleware';

const router = express.Router();

// Create payment
router.post('/create', authenticate, async (req: any, res) => {
    try {
        const userId = req.user.userId; // Assuming authenticate middleware adds user to req
        const { amount = 1.00, description = 'Subscription Payment' } = req.body; // Default 1 RUB for testing

        // Return URL should be the frontend page where user lands after payment
        // Assuming frontend is running on same domain or configured URL
        // For now, let's assume localhost or the production URL
        // We can pass returnUrl from frontend or hardcode it
        const returnUrl = req.body.returnUrl || 'http://localhost:5173/payment/success';

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
        // Basic validation could be added here (check IP, signature if needed)

        if (event.event === 'payment.succeeded' || event.event === 'payment.canceled' || event.event === 'payment.waiting_for_capture') {
            await handleWebhook(event);
        }

        res.status(200).send('OK');
    } catch (error) {
        logger.error({ err: error }, 'Webhook error');
        res.status(500).send('Webhook processing failed');
    }
});

export default router;
