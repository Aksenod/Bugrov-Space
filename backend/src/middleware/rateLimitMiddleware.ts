import rateLimit from 'express-rate-limit';
import { env } from '../env';

// Общий rate limiter для всех API запросов
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: env.nodeEnv === 'production' ? 100 : 1000, // 100 запросов в продакшене, 1000 в dev
  message: { 
    error: 'Too many requests from this IP, please try again later.',
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Строгий rate limiter для аутентификации (защита от brute force)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 10, // 10 попыток входа за 15 минут (увеличено с 5)
  message: { 
    error: 'Слишком много попыток входа. Пожалуйста, подождите 15 минут и попробуйте снова.',
    message: 'Слишком много попыток входа. Пожалуйста, подождите 15 минут и попробуйте снова.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Не считать успешные запросы
});



