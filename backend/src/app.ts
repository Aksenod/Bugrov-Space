import express from 'express';
import cors from 'cors';
import routes from './routes';

const app = express();

// Middleware для логирования всех запросов
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusColor = res.statusCode >= 400 ? '❌' : res.statusCode >= 300 ? '⚠️' : '✅';
    console.log(`${statusColor} [${req.method} ${req.path}] ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

app.use(
  cors({
    origin: '*',
    credentials: true,
  }),
);
app.use(express.json({ limit: '5mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', routes);

export default app;

