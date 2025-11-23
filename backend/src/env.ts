import dotenv from 'dotenv';
import path from 'path';

// В CommonJS __dirname доступен напрямую
// Загружаем .env файл из папки backend
const envResult = dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Проверяем, загрузились ли переменные
if (envResult.error) {
  console.warn('[ENV] Warning: Failed to load .env file:', envResult.error.message);
  console.warn('[ENV] Attempting to load from process.env...');
} else {
  const loadedCount = Object.keys(envResult.parsed || {}).length;
  if (loadedCount === 0) {
    console.warn('[ENV] Warning: .env file found but contains no variables');
  } else {
    console.log(`[ENV] Loaded ${loadedCount} environment variable(s) from .env file`);
  }
}

const required = ['JWT_SECRET', 'OPENAI_API_KEY'] as const;

// Используем console.error здесь, так как logger еще не инициализирован
for (const key of required) {
  const value = process.env[key];
  if (!value || value.length === 0) {
    console.error(`[ENV] ERROR: Missing required environment variable: ${key}`);
    console.error(`[ENV] Please check that .env file exists in backend/ directory and contains ${key}`);
    throw new Error(`Missing required environment variable: ${key}`);
  }
  
  // Дополнительная проверка для OPENAI_API_KEY (только предупреждение, не блокируем)
  if (key === 'OPENAI_API_KEY') {
    const trimmed = value.trim();
    if (!trimmed.startsWith('sk-') && !trimmed.startsWith('org-')) {
      console.warn(`[ENV] WARNING: OPENAI_API_KEY format may be non-standard (usually starts with 'sk-')`);
      console.warn(`[ENV] This may be a proxy or custom API endpoint key`);
    }
    if (trimmed.length < 10) {
      console.warn(`[ENV] WARNING: OPENAI_API_KEY seems very short (${trimmed.length} characters)`);
    }
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




