import express from 'express';
import cors from 'cors';
import routes from './routes';
import { env } from './env';
import { apiRateLimiter } from './middleware/rateLimitMiddleware';
import { logger } from './utils/logger';
import { prisma } from './db/prisma';

const app = express();

// Настраиваем trust proxy для правильной работы за прокси (Render.com, Heroku и т.д.)
// Это позволяет Express правильно определять IP клиента через заголовки X-Forwarded-For
app.set('trust proxy', 1);

// Middleware для логирования всех запросов
// В продакшене логируем только ошибки и предупреждения, в dev - все запросы
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const isProduction = env.nodeEnv === 'production';
    const logLevel = res.statusCode >= 400 ? 'error' : res.statusCode >= 300 ? 'warn' : 'info';
    
    // Временно логируем все запросы для диагностики
    // В продакшене логируем только ошибки и предупреждения, в dev - все
    // if (isProduction && res.statusCode < 300) {
    //   return; // Пропускаем успешные запросы в продакшене
    // }
    
    logger[logLevel]({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    }, `${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

// Улучшенная настройка CORS с явной поддержкой всех origins и логированием
app.use(
  cors({
    origin: (origin, callback) => {
      // Если CORS_ORIGIN не установлен или равен '*', разрешаем все origins
      if (env.corsOrigin === '*' || !env.corsOrigin) {
        if (env.nodeEnv === 'development') {
          logger.info({ origin, corsOrigin: env.corsOrigin }, 'CORS: Allowing all origins');
        }
        callback(null, true);
        return;
      }

      // Нормализуем origin (убираем trailing slash для сравнения)
      const normalizeOrigin = (orig: string) => orig.replace(/\/$/, '');

      // Если CORS_ORIGIN - массив строк, проверяем вхождение
      if (Array.isArray(env.corsOrigin)) {
        // Если origin не указан (например, для запросов из Postman, curl или мобильных приложений)
        // Разрешаем такие запросы только если это не браузерный запрос
        if (!origin) {
          if (env.nodeEnv === 'development') {
            logger.info('CORS: Allowing request without origin (non-browser request)');
          }
          callback(null, true);
          return;
        }
        
        const normalizedOrigin = normalizeOrigin(origin);
        
        // Проверяем, есть ли origin в списке разрешенных
        const isAllowed = env.corsOrigin.some(allowedOrigin => {
          const normalizedAllowed = normalizeOrigin(allowedOrigin);
          
          // Поддержка wildcard поддоменов (например, *.example.com)
          if (normalizedAllowed.includes('*')) {
            const pattern = normalizedAllowed.replace(/\*/g, '.*');
            const regex = new RegExp(`^${pattern}$`);
            return regex.test(normalizedOrigin);
          }
          
          // Точное совпадение (без учета trailing slash)
          return normalizedOrigin === normalizedAllowed;
        });

        if (isAllowed) {
          if (env.nodeEnv === 'development') {
            logger.info({ origin: normalizedOrigin, allowedOrigins: env.corsOrigin }, 'CORS: Origin allowed');
          }
          callback(null, true);
        } else {
          logger.warn({ origin: normalizedOrigin, allowedOrigins: env.corsOrigin }, 'CORS: Origin not allowed');
          callback(new Error('Not allowed by CORS'));
        }
        return;
      }

      // Если CORS_ORIGIN - строка (один origin) - это не должно происходить после getCorsOrigin(),
      // но оставляем для совместимости
      if (typeof env.corsOrigin === 'string') {
        const normalizedOrigin = origin ? normalizeOrigin(origin) : '';
        const normalizedAllowed = normalizeOrigin(env.corsOrigin);
        
        if (!origin || normalizedOrigin === normalizedAllowed) {
          if (env.nodeEnv === 'development') {
            logger.info({ origin: normalizedOrigin, allowedOrigin: normalizedAllowed }, 'CORS: Origin allowed');
          }
          callback(null, true);
        } else {
          logger.warn({ origin: normalizedOrigin, allowedOrigin: normalizedAllowed }, 'CORS: Origin not allowed');
          callback(new Error('Not allowed by CORS'));
        }
        return;
      }

      // Fallback: разрешаем все
      logger.warn({ corsOrigin: env.corsOrigin }, 'CORS: Unknown corsOrigin type, allowing all');
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Type'],
    optionsSuccessStatus: 200, // Для старых браузеров
    maxAge: 86400, // Кешировать preflight запросы на 24 часа
  }),
);

app.use(express.json({ limit: '30mb' })); // Увеличено для поддержки аудио файлов в base64
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Применяем rate limiting ко всем API запросам
app.use('/api', apiRateLimiter);

app.get('/health', async (_req, res) => {
  try {
    // Проверяем подключение к БД
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: 'ok',
      database: 'connected'
    });
  } catch (error: any) {
    res.status(503).json({ 
      status: 'unhealthy',
      database: 'disconnected',
      error: env.nodeEnv === 'development' ? error.message : 'Database unavailable'
    });
  }
});

app.use('/api', routes);

// Error handler должен быть последним middleware
import { errorHandler } from './middleware/errorHandler';
app.use(errorHandler);

export default app;

