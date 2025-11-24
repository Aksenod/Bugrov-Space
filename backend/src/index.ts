import app from './app';
import { env } from './env';
import { logger } from './utils/logger';
import { ensureConnection } from './db/prisma';

const port = env.port;

// Проверяем подключение к БД перед запуском сервера
async function startServer() {
  const maxRetries = 5;
  const retryDelay = 2000; // 2 секунды
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`Checking database connection... (attempt ${attempt}/${maxRetries})`);
      await ensureConnection();
      logger.info('Database connection successful');
      
      app.listen(port, () => {
        logger.info(`Backend server listening on port ${port}`);
      });
      return; // Успешно подключились, выходим
    } catch (error: any) {
      logger.warn({ 
        error: error.message, 
        attempt,
        maxRetries 
      }, `Failed to connect to database (attempt ${attempt}/${maxRetries})`);
      
      if (attempt < maxRetries) {
        logger.info(`Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        logger.error('Failed to connect to database after all retries');
        logger.error('Server will not start without database connection');
        process.exit(1);
      }
    }
  }
}

startServer();

