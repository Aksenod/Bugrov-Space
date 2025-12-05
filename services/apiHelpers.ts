/**
 * Общие вспомогательные функции для API запросов
 */

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'https://bugrov-space.onrender.com/api').replace(/\/$/, '');
const TOKEN_STORAGE_KEY = 'bugrov_space_token';

let authToken: string | null =
  typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_STORAGE_KEY) : null;

// Глобальная блокировка запросов после получения 429
let rateLimitBlockedUntil: number | null = null;
const RATE_LIMIT_BLOCK_DURATION = 60 * 1000; // Блокируем на 60 секунд после получения 429

// Таймауты
const REQUEST_TIMEOUT = 10000;
const OPENAI_REQUEST_TIMEOUT = 60000; // 60 секунд для запросов к OpenAI

export const setToken = (token: string | null) => {
  authToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  }
};

export const getToken = () => {
  // Всегда читаем актуальное значение из localStorage, чтобы избежать проблем с синхронизацией
  if (typeof window !== 'undefined') {
    const tokenFromStorage = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (tokenFromStorage !== authToken) {
      authToken = tokenFromStorage;
    }
  }
  return authToken;
};

export const clearToken = () => setToken(null);

export const clearRateLimitBlock = () => {
  rateLimitBlockedUntil = null;
  if (import.meta.env.DEV) {
    console.log('[API] Rate limit block cleared');
  }
};

export const isRateLimitBlocked = () => {
  return rateLimitBlockedUntil !== null && Date.now() < rateLimitBlockedUntil;
};

export const getRateLimitBlockRemaining = () => {
  if (!rateLimitBlockedUntil || Date.now() >= rateLimitBlockedUntil) {
    return 0;
  }
  return Math.ceil((rateLimitBlockedUntil - Date.now()) / 1000);
};

const getHeaders = (custom: Record<string, string> = {}) => {
  const headers: Record<string, string> = { ...custom };
  if (!(custom['Content-Type'])) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

const parseError = async (response: Response) => {
  try {
    const data = await response.json();

    // Сначала проверяем поле message на верхнем уровне (приоритет)
    if (data?.message && typeof data.message === 'string') {
      return data.message;
    }

    const error = data?.error;

    // Если error - это строка, возвращаем её
    if (typeof error === 'string') {
      return error;
    }

    // Если error - это объект (например, от zod.flatten())
    if (error && typeof error === 'object') {
      const errorMessages: string[] = [];

      // Обработка fieldErrors: { field: ['error1', 'error2'] }
      if (error.fieldErrors && typeof error.fieldErrors === 'object') {
        Object.entries(error.fieldErrors).forEach(([field, errors]) => {
          if (Array.isArray(errors)) {
            errors.forEach((err) => {
              if (typeof err === 'string') {
                errorMessages.push(`${field}: ${err}`);
              }
            });
          } else if (typeof errors === 'string') {
            errorMessages.push(`${field}: ${errors}`);
          }
        });
      }

      // Обработка formErrors: ['error1', 'error2']
      if (error.formErrors && Array.isArray(error.formErrors)) {
        error.formErrors.forEach((err) => {
          if (typeof err === 'string') {
            errorMessages.push(err);
          }
        });
      }

      // Если есть другие поля в объекте ошибки
      if (errorMessages.length === 0) {
        // Пытаемся найти сообщение в других полях
        if (error.message && typeof error.message === 'string') {
          return error.message;
        }
        // Если ничего не найдено, возвращаем JSON строку
        return JSON.stringify(error);
      }

      return errorMessages.join('. ') || 'Validation error';
    }

    return response.statusText || 'Request failed';
  } catch {
    return response.statusText || 'Request failed';
  }
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  // Проверяем, не заблокированы ли мы из-за rate limit
  // Исключаем auth роуты из блокировки - пользователь должен всегда иметь возможность залогиниться
  const isAuthRoute = path === '/auth/login' || path === '/auth/register' || path === '/auth/reset';
  if (!isAuthRoute && rateLimitBlockedUntil && Date.now() < rateLimitBlockedUntil) {
    const remainingSeconds = Math.ceil((rateLimitBlockedUntil - Date.now()) / 1000);
    const error = new Error(`Rate limit exceeded. Please wait ${remainingSeconds} seconds before trying again.`) as Error & { status?: number; isRateLimit?: boolean };
    error.status = 429;
    error.isRateLimit = true;
    throw error;
  }

  // Определяем timeout в зависимости от типа запроса
  // POST запросы к /agents/:agentId/messages и /agents/:agentId/summary требуют больше времени (OpenAI API)
  const isOpenAiRequest = path.includes('/agents/') &&
    (path.includes('/messages') || path.includes('/summary')) &&
    init.method === 'POST';

  // Генерация прототипа требует еще больше времени (2 последовательных AI запроса)
  const isPrototypeGeneration = path.includes('/generate-prototype') && init.method === 'POST';

  const timeout = isPrototypeGeneration ? 120000 : (isOpenAiRequest ? OPENAI_REQUEST_TIMEOUT : REQUEST_TIMEOUT);

  // Для запросов к агентам и генерации прототипа НЕ используем AbortController - позволяем запросу продолжаться
  // даже если он превышает таймаут, так как сервер может все равно вернуть ответ
  // Для обычных запросов используем таймаут с отменой
  let controller: AbortController | null = null;
  let timeoutId: NodeJS.Timeout | null = null;

  if (!isOpenAiRequest && !isPrototypeGeneration) {
    controller = new AbortController();
    timeoutId = setTimeout(() => controller!.abort(), timeout);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: getHeaders(init.headers as Record<string, string>),
      signal: controller?.signal,
    });

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Обработка rate limit (429)
    if (response.status === 429) {
      rateLimitBlockedUntil = Date.now() + RATE_LIMIT_BLOCK_DURATION;
      const errorMessage = await parseError(response);
      const error = new Error(errorMessage) as Error & { status?: number; isRateLimit?: boolean };
      error.status = 429;
      error.isRateLimit = true;
      throw error;
    }

    // Специальная обработка статусов, когда сервер недоступен
    if (response.status === 502) {
      const error = new Error('Сервер временно недоступен. Сервер может быть на техническом обслуживании. Попробуйте позже.') as Error & { status?: number; isServerError?: boolean };
      error.status = 502;
      error.isServerError = true;
      throw error;
    }

    if (response.status === 503) {
      const error = new Error('Сервис временно недоступен. Сервер может быть перегружен или на техническом обслуживании. Попробуйте позже.') as Error & { status?: number; isServerError?: boolean };
      error.status = 503;
      error.isServerError = true;
      throw error;
    }

    if (response.status === 504) {
      const error = new Error('Сервер не отвечает. Превышено время ожидания ответа от сервера. Попробуйте позже.') as Error & { status?: number; isServerError?: boolean };
      error.status = 504;
      error.isServerError = true;
      throw error;
    }

    if (!response.ok) {
      const errorMessage = await parseError(response);
      const error = new Error(errorMessage) as Error & { status?: number };
      error.status = response.status;
      throw error;
    }

    return response.json();
  } catch (error: any) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Обработка ошибки таймаута
    if (error.name === 'AbortError' || (controller && controller.signal.aborted)) {
      const timeoutSeconds = Math.ceil(timeout / 1000);
      const timeoutError = new Error(`Запрос превысил время ожидания (${timeoutSeconds} секунд). Сервер может быть перегружен или недоступен.`) as Error & { status?: number; isTimeout?: boolean };
      timeoutError.status = 408;
      timeoutError.isTimeout = true;
      throw timeoutError;
    }

    // Обработка сетевых ошибок (когда сервер вообще не отвечает)
    if (
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('NetworkError') ||
      error.message?.includes('Network request failed') ||
      error.message?.includes('Load failed') ||
      error.name === 'TypeError' ||
      (error.message && typeof error.message === 'string' && error.message.toLowerCase().includes('network'))
    ) {
      const networkError = new Error('Не удалось подключиться к серверу. Проверьте подключение к интернету или попробуйте позже. Сервер может быть недоступен.') as Error & { status?: number; isNetworkError?: boolean };
      networkError.status = 0;
      networkError.isNetworkError = true;
      throw networkError;
    }

    // Если ошибка уже имеет статус (например, 502, 503, 504), пробрасываем её как есть
    if (error.status) {
      throw error;
    }

    // Для всех остальных ошибок пробрасываем как есть
    throw error;
  }
}

