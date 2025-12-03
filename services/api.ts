const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'https://bugrov-space.onrender.com/api').replace(/\/$/, '');
const TOKEN_STORAGE_KEY = 'bugrov_space_token';

let authToken: string | null =
  typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_STORAGE_KEY) : null;

const getHeaders = (custom: Record<string, string> = {}) => {
  const headers: Record<string, string> = { ...custom };
  if (!(custom['Content-Type'])) {
    headers['Content-Type'] = 'application/json';
  }
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
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

// Таймаут для всех запросов (10 секунд)
// Для запросов к OpenAI (POST /agents/:agentId/messages) используется увеличенный timeout
const REQUEST_TIMEOUT = 10000;
const OPENAI_REQUEST_TIMEOUT = 60000; // 60 секунд для запросов к OpenAI

// Глобальная блокировка запросов после получения 429
let rateLimitBlockedUntil: number | null = null;
const RATE_LIMIT_BLOCK_DURATION = 60 * 1000; // Блокируем на 60 секунд после получения 429

// Функция для задержки
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
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
    // Для обычных запросов используем таймаут с отменой
    controller = new AbortController();
    timeoutId = setTimeout(() => controller!.abort(), timeout);
  }

  const url = `${API_BASE_URL}${path}`;
  const startTime = Date.now();
  const isDev = import.meta.env.DEV;

  try {
    if (isDev) {
      console.log(`[API] Request: ${init.method || 'GET'} ${url}`);
    }
    const response = await fetch(url, {
      ...init,
      ...(controller ? { signal: controller.signal } : {}),
      headers: getHeaders(init.headers as Record<string, string>),
    });

    const duration = Date.now() - startTime;
    if (isDev) {
      console.log(`[API] Response: ${response.status} in ${duration}ms`);
    }

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Если запрос к агенту или генерация прототипа заняли больше таймаута, логируем предупреждение, но не ошибку
    if ((isOpenAiRequest || isPrototypeGeneration) && duration > timeout && isDev) {
      console.warn(`[API] Request took ${duration}ms (exceeded ${timeout}ms timeout), but response received successfully`);
    }

    // Если получили 429 - блокируем все запросы на некоторое время
    // НО не блокируем, если это auth роут - пользователь должен иметь возможность залогиниться
    if (response.status === 429 && !isAuthRoute) {
      rateLimitBlockedUntil = Date.now() + RATE_LIMIT_BLOCK_DURATION;
      if (isDev) {
        console.warn(`[API] Rate limit hit! Blocking all requests for ${RATE_LIMIT_BLOCK_DURATION / 1000} seconds`);
      }
      const message = await parseError(response);
      const error = new Error(message || 'Too many requests from this IP, please try again later.') as Error & { status?: number; isRateLimit?: boolean };
      error.status = 429;
      error.isRateLimit = true;
      throw error;
    }

    // Если 429 на auth роуте - просто пробрасываем ошибку без блокировки
    if (response.status === 429 && isAuthRoute) {
      const message = await parseError(response);
      const error = new Error(message || 'Too many requests from this IP, please try again later.') as Error & { status?: number; isRateLimit?: boolean };
      error.status = 429;
      error.isRateLimit = true;
      throw error;
    }

    if (!response.ok) {
      const message = await parseError(response);
      const error = new Error(message || 'Request failed') as Error & { status?: number };
      error.status = response.status; // Добавляем HTTP статус к ошибке
      throw error;
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (error: any) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    const duration = Date.now() - startTime;

    // Если это 429 ошибка - устанавливаем блокировку (но не для auth роутов)
    if (error.status === 429 && !isAuthRoute) {
      rateLimitBlockedUntil = Date.now() + RATE_LIMIT_BLOCK_DURATION;
      if (isDev) {
        console.warn(`[API] Rate limit error! Blocking all requests for ${RATE_LIMIT_BLOCK_DURATION / 1000} seconds`);
      }
    }

    // Если уже заблокированы - не логируем как ошибку
    if (error.isRateLimit && rateLimitBlockedUntil && Date.now() < rateLimitBlockedUntil) {
      throw error;
    }

    if (isDev) {
      console.error(`[API] Error after ${duration}ms:`, error.name, error.message);
    }

    // Если запрос был отменен из-за таймаута
    // Для запросов к агентам и генерации прототипа НЕ показываем ошибку таймаута, так как сервер может все равно вернуть ответ
    // Для обычных запросов показываем ошибку таймаута как раньше
    if ((error.name === 'AbortError' || (controller && controller.signal.aborted)) && !isOpenAiRequest && !isPrototypeGeneration) {
      if (isDev) {
        console.error(`[API] Request timeout: ${url}`);
      }
      const timeoutSeconds = 10;
      const timeoutError = new Error(`Request timeout: запрос превысил время ожидания (${timeoutSeconds} секунд). Сервер может быть перегружен или недоступен.`) as Error & { status?: number; isTimeout?: boolean };
      timeoutError.status = 408;
      timeoutError.isTimeout = true;
      throw timeoutError;
    }

    // Для запросов к агентам, если произошла ошибка после таймаута, но это не AbortError,
    // значит запрос все еще выполняется - не показываем ошибку таймаута
    if (isOpenAiRequest && duration > OPENAI_REQUEST_TIMEOUT && error.name !== 'AbortError') {
      // Запрос все еще выполняется, просто ждем дольше
      if (isDev) {
        console.warn(`[API] Agent request taking longer than expected (${duration}ms), but still waiting for response...`);
      }
      // Продолжаем ждать - не бросаем ошибку таймаута
    }

    // Обработка сетевых ошибок
    if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError') || error.message?.includes('Network request failed')) {
      if (isDev) {
        console.error(`[API] Network error: ${url}`);
      }
      const networkError = new Error('Network error: не удалось подключиться к серверу. Проверьте подключение к интернету.') as Error & { status?: number; isNetworkError?: boolean };
      networkError.status = 0;
      networkError.isNetworkError = true;
      throw networkError;
    }

    // Пробрасываем другие ошибки
    throw error;
  }
}

export interface ApiUser {
  id: string;
  username: string;
  role?: string; // 'admin' | 'user'
}

export interface ApiAdminUser {
  id: string;
  username: string;
  createdAt: string;
  projectsCount: number;
  isPaid?: boolean;
  subscriptionExpiresAt?: string | null;
}

export interface ApiFile {
  id: string;
  name: string;
  mimeType: string;
  content: string;
  dslContent?: string;
  verstkaContent?: string;
  agentId?: string;
  projectId?: string;
  isKnowledgeBase?: boolean;
  createdAt: string;
}

export interface ApiAgent {
  id: string;
  name: string;
  description: string;
  systemInstruction: string;
  summaryInstruction: string;
  model: string;
  role?: string;
  order?: number;
  isTemplate?: boolean;
  projectTypeId?: string;
  projectTypeAgentId?: string;
  files: ApiFile[];
  isHiddenFromSidebar?: boolean;
}

export interface ApiProjectType {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiProjectTypeAgent {
  id: string;
  projectTypeId?: string; // Для обратной совместимости
  name: string;
  description: string;
  systemInstruction: string;
  summaryInstruction: string;
  model: string;
  role?: string;
  order?: number;
  projectTypes?: Array<{ id: string; name: string; order?: number }>; // Новое поле для связи многие-ко-многим
  createdAt?: string;
  updatedAt?: string;
  isHiddenFromSidebar?: boolean;
}

export interface ApiProject {
  id: string;
  userId: string;
  name: string;
  description?: string;
  projectTypeId: string;
  projectType?: ApiProjectType;
  agentCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiMessage {
  id: string;
  role: 'USER' | 'MODEL';
  text: string;
  createdAt: string;
}

export interface ApiGlobalPrompt {
  content: string;
  createdAt?: string;
  updatedAt?: string;
}

const setToken = (token: string | null) => {
  authToken = token;
  if (typeof window === 'undefined') return;
  if (token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
};

export const api = {
  getToken: () => authToken,
  setToken,
  clearToken: () => setToken(null),
  clearRateLimitBlock: () => {
    rateLimitBlockedUntil = null;
    if (import.meta.env.DEV) {
      console.log('[API] Rate limit block cleared');
    }
  },
  isRateLimitBlocked: () => {
    return rateLimitBlockedUntil !== null && Date.now() < rateLimitBlockedUntil;
  },
  getRateLimitBlockRemaining: () => {
    if (!rateLimitBlockedUntil || Date.now() >= rateLimitBlockedUntil) {
      return 0;
    }
    return Math.ceil((rateLimitBlockedUntil - Date.now()) / 1000);
  },

  async register(payload: { username: string; password: string }) {
    return request<{ token: string; user: ApiUser; agents: ApiAgent[] }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async login(payload: { username: string; password: string }) {
    return request<{ token: string; user: ApiUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async resetPassword(payload: { username: string; newPassword: string }) {
    return request<{ success: boolean }>('/auth/reset', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getCurrentUser() {
    return request<{ user: ApiUser }>('/auth/me');
  },

  async getAgents(projectId: string) {
    if (!projectId || projectId.trim() === '') {
      throw new Error('projectId обязателен');
    }
    return request<{ agents: ApiAgent[]; projectTypeAgents?: ApiProjectTypeAgent[] }>(`/agents?projectId=${encodeURIComponent(projectId)}`);
  },

  async getMessages(agentId: string, projectId?: string) {
    const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
    return request<{ messages: ApiMessage[] }>(`/agents/${agentId}/messages${query}`);
  },

  async clearMessages(agentId: string, projectId?: string) {
    const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
    return request<void>(`/agents/${agentId}/messages${query}`, { method: 'DELETE' });
  },

  async sendMessage(agentId: string, text: string, projectId?: string) {
    return request<{ messages: ApiMessage[]; agentId?: string; templateId?: string }>(`/agents/${agentId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text, projectId }),
    });
  },

  async getAgentFiles(agentId: string) {
    return request<{ files: ApiFile[] }>(`/agents/${agentId}/files`);
  },

  // Admin agent files API (для агентов-шаблонов)
  async uploadAdminAgentFile(agentId: string, payload: { name: string; mimeType: string; content: string; isKnowledgeBase?: boolean }) {
    return request<{ file: ApiFile }>(`/admin/agents/${agentId}/files`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getAdminAgentFiles(agentId: string) {
    return request<{ files: ApiFile[] }>(`/admin/agents/${agentId}/files`);
  },

  async deleteAdminAgentFile(agentId: string, fileId: string) {
    return request<void>(`/admin/agents/${agentId}/files/${fileId}`, { method: 'DELETE' });
  },

  async generateSummary(agentId: string, projectId?: string) {
    const query = projectId ? `?projectId=${projectId}` : '';
    return request<{ file: ApiFile }>(`/agents/${agentId}/summary${query}`, { method: 'POST' });
  },

  async getSummaryFiles(agentId: string, projectId?: string) {
    const query = projectId ? `?projectId=${projectId}` : '';
    return request<{ files: ApiFile[] }>(`/agents/${agentId}/files/summary${query}`);
  },

  async generatePrototype(agentId: string, fileId: string) {
    // Увеличенный таймаут (120 сек) обрабатывается в функции request
    return request<{ file: ApiFile }>(`/agents/${agentId}/files/${fileId}/generate-prototype`, {
      method: 'POST',
    });
  },

  // Projects API
  async getProjects() {
    return request<{ projects: ApiProject[] }>('/projects');
  },

  async getProject(projectId: string) {
    return request<{ project: ApiProject }>(`/projects/${projectId}`);
  },

  async createProject(payload: {
    name: string;
    description?: string;
    projectTypeName?: string; // Для админа
    projectTypeId?: string; // Для пользователя
  }) {
    return request<{ project: ApiProject }>('/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateProject(projectId: string, payload: { name?: string; description?: string }) {
    return request<{ project: ApiProject }>(`/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteProject(projectId: string) {
    return request<void>(`/projects/${projectId}`, { method: 'DELETE' });
  },

  async getProjectFiles(projectId: string) {
    return request<{ files: ApiFile[] }>(`/projects/${projectId}/files`);
  },

  async uploadProjectFile(projectId: string, payload: { name: string; mimeType: string; content: string }) {
    return request<{ file: ApiFile }>(`/projects/${projectId}/files`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async deleteProjectFile(projectId: string, fileId: string) {
    return request<void>(`/projects/${projectId}/files/${fileId}`, { method: 'DELETE' });
  },

  async deleteFileById(fileId: string) {
    return request<void>(`/agents/files/${fileId}`, { method: 'DELETE' });
  },

  async updateFileContent(fileId: string, content: string) {
    return request<{ file: ApiFile }>(`/agents/files/${fileId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    });
  },

  // Project Types API
  async getProjectTypes() {
    return request<{ projectTypes: ApiProjectType[] }>('/project-types');
  },

  async createProjectType(name: string) {
    return request<{ projectType: ApiProjectType }>('/project-types', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  async updateProjectType(id: string, name: string) {
    return request<{ projectType: ApiProjectType }>(`/project-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  },

  async deleteProjectType(id: string) {
    return request<void>(`/project-types/${id}`, { method: 'DELETE' });
  },

  async getProjectTypeAgents(projectTypeId: string) {
    return request<{ agents: ApiProjectTypeAgent[] }>(`/project-types/${projectTypeId}/agents`);
  },

  async createProjectTypeAgent(projectTypeId: string, payload: {
    name: string;
    description?: string;
    systemInstruction?: string;
    summaryInstruction?: string;
    model?: string;
    role?: string;
  }) {
    return request<{ agent: ApiProjectTypeAgent }>(`/project-types/${projectTypeId}/agents`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateProjectTypeAgent(projectTypeId: string, agentId: string, payload: {
    name?: string;
    description?: string;
    systemInstruction?: string;
    summaryInstruction?: string;
    model?: string;
    role?: string;
  }) {
    return request<{ agent: ApiProjectTypeAgent }>(`/project-types/${projectTypeId}/agents/${agentId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteProjectTypeAgent(projectTypeId: string, agentId: string) {
    return request<void>(`/project-types/${projectTypeId}/agents/${agentId}`, { method: 'DELETE' });
  },

  async reorderProjectTypeAgents(projectTypeId: string, orders: { id: string; order: number }[]) {
    return request<{ success: boolean }>(`/project-types/${projectTypeId}/agents/reorder`, {
      method: 'POST',
      body: JSON.stringify({ orders }),
    });
  },

  // Admin agents API (агенты-шаблоны)
  async getAllAgents() {
    return request<{ agents: ApiProjectTypeAgent[] }>('/admin/agents');
  },

  async getAgent(agentId: string) {
    return request<{ agent: ApiProjectTypeAgent }>(`/admin/agents/${agentId}`);
  },

  async createAgentTemplate(payload: {
    name: string;
    description?: string;
    systemInstruction?: string;
    summaryInstruction?: string;
    model?: string;
    role?: string;
    isHiddenFromSidebar?: boolean;
  }) {
    return request<{ agent: ApiProjectTypeAgent }>('/admin/agents', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateAgentTemplate(agentId: string, payload: {
    name?: string;
    description?: string;
    systemInstruction?: string;
    summaryInstruction?: string;
    model?: string;
    role?: string;
    isHiddenFromSidebar?: boolean;
  }) {
    return request<{ agent: ApiProjectTypeAgent }>(`/admin/agents/${agentId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteAgentTemplate(agentId: string) {
    return request<void>(`/admin/agents/${agentId}`, { method: 'DELETE' });
  },

  async getAgentProjectTypes(agentId: string) {
    return request<{ projectTypes: Array<{ id: string; name: string; order?: number }> }>(`/admin/agents/${agentId}/project-types`);
  },

  async attachAgentToProjectTypes(agentId: string, projectTypeIds: string[]) {
    return request<{ success: boolean }>(`/admin/agents/${agentId}/project-types`, {
      method: 'POST',
      body: JSON.stringify({ projectTypeIds }),
    });
  },

  async detachAgentFromProjectType(agentId: string, projectTypeId: string) {
    return request<void>(`/admin/agents/${agentId}/project-types/${projectTypeId}`, { method: 'DELETE' });
  },

  async getGlobalPrompt() {
    return request<{ globalPrompt: ApiGlobalPrompt }>('/admin/global-prompt');
  },

  async updateGlobalPrompt(payload: { content: string }) {
    return request<{ globalPrompt: ApiGlobalPrompt }>('/admin/global-prompt', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  // Admin users API
  async getUsers() {
    return request<{ users: ApiAdminUser[]; totalUsers: number; totalProjects: number }>('/admin/users');
  },

  // Public Prototype API
  async createPublicPrototype(fileId: string) {
    return request<{ hash: string; url: string }>(`/public/prototype`, {
      method: 'POST',
      body: JSON.stringify({ fileId }),
    });
  },

  async getPublicPrototype(hash: string) {
    return request<{ prototype: { id: string; name: string; html: string; dsl: string | null } }>(`/public/prototype/${hash}`);
  },

  // Payment API
  async createPayment(payload: { amount: string; description: string }) {
    return request<{ confirmationUrl: string }>('/payment/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};


