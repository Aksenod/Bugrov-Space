import dotenv from 'dotenv';

dotenv.config();

const required = ['JWT_SECRET', 'OPENAI_API_KEY'] as const;

// Используем console.error здесь, так как logger еще не инициализирован
for (const key of required) {
  if (!process.env[key] || process.env[key]?.length === 0) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const getCorsOrigin = (): string | string[] => {
  const corsOrigin = process.env.CORS_ORIGIN;
  if (!corsOrigin) {
    // В dev режиме разрешаем localhost, в prod нужно указать явно
    return process.env.NODE_ENV === 'production' 
      ? [] 
      : ['http://localhost:3000', 'http://localhost:5173'];
  }
  return corsOrigin.split(',').map(origin => origin.trim());
};

export const env = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET!,
  openAiApiKey: process.env.OPENAI_API_KEY!,
  corsOrigin: getCorsOrigin(),
  nodeEnv: process.env.NODE_ENV ?? 'development',
};


