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
    // В dev режиме разрешаем localhost, в prod разрешаем GitHub Pages и все origins для совместимости
    if (process.env.NODE_ENV === 'production') {
      // Разрешаем все origins в production для GitHub Pages (так как могут быть разные поддомены)
      return '*';
    }
    return ['http://localhost:3000', 'http://localhost:5173'];
  }
  const origins = corsOrigin.split(',').map(origin => origin.trim());
  // Если указан '*', возвращаем его для разрешения всех origins
  if (origins.includes('*')) {
    return '*';
  }
  return origins;
};

export const env = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET!,
  openAiApiKey: process.env.OPENAI_API_KEY!,
  corsOrigin: getCorsOrigin(),
  nodeEnv: process.env.NODE_ENV ?? 'development',
};



