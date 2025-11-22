import app from './app';
import { env } from './env';
import { logger } from './utils/logger';

const port = env.port;

app.listen(port, () => {
  logger.info(`Backend server listening on port ${port}`);
});

