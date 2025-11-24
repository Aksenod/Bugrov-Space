import express from 'express';
import cors from 'cors';
import routes from './routes';
import { env } from './env';
import { apiRateLimiter } from './middleware/rateLimitMiddleware';
import { logger } from './utils/logger';
import { prisma } from './db/prisma';

const app = express();

// Middleware для логирования всех запросов
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'error' : res.statusCode >= 300 ? 'warn' : 'info';
    logger[logLevel]({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    }, `${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

app.use(
  cors({
    origin: env.corsOrigin === '*' 
      ? (_origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => callback(null, true) 
      : env.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200, // Для старых браузеров
  }),
);

app.use(express.json({ limit: '5mb' }));

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

