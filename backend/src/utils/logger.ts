import pino from 'pino';
import path from 'path';
import { env } from '../env';

// ============================================================================
// Константы
// ============================================================================

const PROJECT_ROOT = path.resolve(__dirname, '..');

const SENSITIVE_FIELD_PATTERNS = [
  'password',
  'secret',
  'token',
  'key',
  'credential',
] as const;

const SENSITIVE_FIELD_EXACT_MATCHES = [
  'databaseurl',
  'database_url',
  'dburl',
  'db_url',
] as const;

const PATH_FIELD_PATTERNS = [
  'path',
  'file',
] as const;

const PATH_FIELD_EXACT_MATCHES = [
  'filepath',
  'file_path',
] as const;

const DATABASE_PROTOCOLS = ['postgresql', 'mysql'] as const;

// ============================================================================
// Утилиты для работы с путями
// ============================================================================

/**
 * Конвертирует абсолютный путь в относительный от корня проекта
 */
function normalizePath(filePath: string | undefined): string | undefined {
  if (!filePath || typeof filePath !== 'string') {
    return filePath;
  }

  if (!path.isAbsolute(filePath)) {
    return filePath;
  }

  try {
    const relativePath = path.relative(PROJECT_ROOT, filePath);
    // Если путь находится вне проекта, возвращаем только имя файла
    if (relativePath.startsWith('..')) {
      return path.basename(filePath);
    }
    return relativePath;
  } catch {
    return path.basename(filePath);
  }
}

/**
 * Проверяет, является ли поле путем к файлу
 */
function isPathField(fieldName: string): boolean {
  const lowerField = fieldName.toLowerCase();
  
  return (
    PATH_FIELD_EXACT_MATCHES.includes(lowerField as any) ||
    PATH_FIELD_PATTERNS.some(pattern => lowerField.includes(pattern))
  );
}

// ============================================================================
// Утилиты для маскировки данных
// ============================================================================

/**
 * Маскирует Database URL, скрывая чувствительные части
 */
function maskDatabaseUrl(urlString: string): string {
  try {
    const url = new URL(urlString);
    url.username = '***';
    url.password = '***';
    url.hostname = '***';
    if (url.pathname && url.pathname.length > 1) {
      url.pathname = '/***';
    }
    return url.toString();
  } catch {
    // Fallback: простая маскировка через regex
    return urlString
      .replace(/:\/\/[^@]+@/, '://***:***@')
      .replace(/@[^\/]+/, '@***');
  }
}

/**
 * Маскирует чувствительные данные в строках
 */
function maskSensitiveString(value: string): string {
  const isDatabaseUrl = 
    value.includes('://') && 
    (value.includes('@') || DATABASE_PROTOCOLS.some(proto => value.includes(proto)));

  if (isDatabaseUrl) {
    return maskDatabaseUrl(value);
  }

  return value;
}

/**
 * Проверяет, является ли поле чувствительным
 */
function isSensitiveField(fieldName: string): boolean {
  const lowerField = fieldName.toLowerCase();
  
  return (
    SENSITIVE_FIELD_EXACT_MATCHES.includes(lowerField as any) ||
    SENSITIVE_FIELD_PATTERNS.some(pattern => lowerField.includes(pattern))
  );
}

/**
 * Рекурсивно маскирует чувствительные данные в объекте
 */
function maskSensitiveData(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return maskSensitiveString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => maskSensitiveData(item));
  }

  if (typeof obj === 'object') {
    const masked: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (isSensitiveField(key)) {
        masked[key] = '***';
      } else if (isPathField(key)) {
        masked[key] = normalizePath(value as string);
      } else if (typeof value === 'object' && value !== null) {
        masked[key] = maskSensitiveData(value);
      } else if (typeof value === 'string') {
        masked[key] = maskSensitiveString(value);
      } else {
        masked[key] = value;
      }
    }
    
    return masked;
  }

  return obj;
}

// ============================================================================
// Сериализаторы для pino
// ============================================================================

/**
 * Создает сериализаторы с автоматической маскировкой чувствительных данных
 */
function createSerializers() {
  return {
    ...pino.stdSerializers,
    req: (req: unknown) => {
      if (!req) return req;
      const serialized = pino.stdSerializers.req(req as any);
      return maskSensitiveData(serialized);
    },
    res: (res: unknown) => {
      if (!res) return res;
      const serialized = pino.stdSerializers.res(res as any);
      return maskSensitiveData(serialized);
    },
    err: (err: unknown) => {
      if (!err) return err;
      const serialized = pino.stdSerializers.err(err as any);
      return maskSensitiveData(serialized);
    },
  };
}

// ============================================================================
// Конфигурация транспортов
// ============================================================================

/**
 * Создает конфигурацию транспорта для development окружения
 */
function createDevelopmentTransport(
  logLevel: string,
  logToFile: boolean
): pino.TransportSingleOptions | pino.TransportMultiOptions {
  const consoleTransport: pino.TransportSingleOptions = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
    },
  };

  if (!logToFile) {
    return consoleTransport;
  }

  return {
    targets: [
      {
        ...consoleTransport,
        level: logLevel,
      },
      {
        target: 'pino/file',
        level: logLevel,
        options: {
          destination: path.join(PROJECT_ROOT, 'backend-dev.log'),
        },
      },
    ],
  };
}

/**
 * Создает конфигурацию транспорта для production окружения
 */
function createProductionTransport(
  logLevel: string,
  logToFile: boolean
): pino.TransportMultiOptions | undefined {
  if (!logToFile) {
    return undefined; // Только stdout в JSON формате
  }

  return {
    targets: [
      {
        target: 'pino/file',
        level: logLevel,
        options: {
          destination: 1, // stdout
        },
      },
      {
        target: 'pino/file',
        level: logLevel,
        options: {
          destination: path.join(PROJECT_ROOT, 'backend.log'),
        },
      },
    ],
  };
}

/**
 * Создает конфигурацию транспорта в зависимости от окружения
 */
function createTransport(
  nodeEnv: string,
  logLevel: string,
  logToFile: boolean
): pino.TransportMultiOptions | pino.TransportSingleOptions | undefined {
  if (nodeEnv === 'development') {
    return createDevelopmentTransport(logLevel, logToFile);
  }
  
  return createProductionTransport(logLevel, logToFile);
}

// ============================================================================
// Создание logger
// ============================================================================

/**
 * Получает уровень логирования из переменных окружения
 */
function getLogLevel(): string {
  return process.env.LOG_LEVEL || (env.nodeEnv === 'production' ? 'info' : 'debug');
}

/**
 * Проверяет, нужно ли логировать в файл
 */
function shouldLogToFile(): boolean {
  return process.env.LOG_TO_FILE === 'true';
}

const logLevel = getLogLevel();
const logToFile = shouldLogToFile();
const transport = createTransport(env.nodeEnv, logLevel, logToFile);

export const logger = pino({
  level: logLevel,
  serializers: createSerializers(),
  transport,
  formatters: {
    log: (object: Record<string, unknown>) => {
      return maskSensitiveData(object) as Record<string, unknown>;
    },
  },
});
