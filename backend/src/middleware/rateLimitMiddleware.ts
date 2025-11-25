import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';
import { env } from '../env';

// Функция для получения реального IP клиента (учитывает прокси)
const getClientIp = (req: Request): string => {
  // На Render.com и других платформах с прокси используем заголовки
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // X-Forwarded-For может содержать несколько IP через запятую
    // Первый IP - это реальный IP клиента
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips.split(',')[0].trim();
  }
  
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }
  
  // Fallback на стандартный IP
  return req.ip || req.socket.remoteAddress || 'unknown';
};

// Проверяем, нужно ли вообще применять rate limiting
const shouldApplyRateLimit = (): boolean => {
  // Можно отключить через переменную окружения
  if (process.env.DISABLE_RATE_LIMIT === 'true') {
    return false;
  }
  return true;
};

// Создаем rate limiter один раз при инициализации модуля, а не при каждом запросе
const createApiRateLimiter = () => {
  if (!shouldApplyRateLimit()) {
    return (req: Request, res: Response, next: NextFunction) => next();
  }

  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: env.nodeEnv === 'production' ? 10000 : 1000, // Значительно увеличен лимит для продакшена
    message: { 
      error: 'Too many requests from this IP, please try again later.',
      message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => getClientIp(req), // Используем кастомную функцию для определения IP
    validate: {
      trustProxy: false, // Отключаем проверку, так как используем кастомную функцию getClientIp
    },
  });
};

// Общий rate limiter для всех API запросов
// Увеличен лимит, так как на Render.com все запросы могут идти через один прокси
const apiRateLimiterInstance = createApiRateLimiter();

export const apiRateLimiter = (req: Request, res: Response, next: NextFunction) => {
  // Пропускаем rate limiting для GET запросов (они менее опасны)
  if (req.method === 'GET') {
    return next();
  }

  // Пропускаем rate limiting для /auth/me - он уже защищен authMiddleware
  if (req.path === '/auth/me') {
    return next();
  }

  // Применяем rate limiting только для POST/PUT/DELETE запросов
  return apiRateLimiterInstance(req, res, next);
};

// Строгий rate limiter для аутентификации (защита от brute force)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 20, // 20 попыток входа за 15 минут (достаточно для нормального использования)
  message: { 
    error: 'Слишком много попыток входа. Пожалуйста, подождите 15 минут и попробуйте снова.',
    message: 'Слишком много попыток входа. Пожалуйста, подождите 15 минут и попробуйте снова.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Не считать успешные запросы
  keyGenerator: (req) => getClientIp(req), // Используем кастомную функцию для определения IP
  validate: {
    trustProxy: false, // Отключаем проверку, так как используем кастомную функцию getClientIp
  },
});



