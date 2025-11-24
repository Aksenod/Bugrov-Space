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

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: getHeaders(init.headers as Record<string, string>),
  });

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
}

export interface ApiUser {
  id: string;
  username: string;
  role?: string; // 'admin' | 'user'
}

export interface ApiFile {
  id: string;
  name: string;
  mimeType: string;
  content: string;
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
  files: ApiFile[];
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
  projectTypeId: string;
  name: string;
  description: string;
  systemInstruction: string;
  summaryInstruction: string;
  model: string;
  role?: string;
  order: number;
  createdAt?: string;
  updatedAt?: string;
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

  async createAgent(payload: {
    name: string;
    description?: string;
    systemInstruction?: string;
    summaryInstruction?: string;
    model?: string;
    role?: string;
    projectId: string;
  }) {
    return request<{ agent: ApiAgent }>('/agents', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateAgent(agentId: string, payload: Partial<Omit<ApiAgent, 'id' | 'files'>>) {
    return request<{ agent: ApiAgent }>(`/agents/${agentId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async reorderAgents(orders: { id: string; order: number }[]) {
    return request<{ success: boolean }>(`/agents/reorder`, {
      method: 'POST',
      body: JSON.stringify({ orders }),
    });
  },

  async deleteAgent(agentId: string) {
    return request<void>(`/agents/${agentId}`, { method: 'DELETE' });
  },

  async getMessages(agentId: string) {
    return request<{ messages: ApiMessage[] }>(`/agents/${agentId}/messages`);
  },

  async clearMessages(agentId: string) {
    return request<void>(`/agents/${agentId}/messages`, { method: 'DELETE' });
  },

  async sendMessage(agentId: string, text: string, projectId?: string) {
    return request<{ messages: ApiMessage[] }>(`/agents/${agentId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text, projectId }),
    });
  },

  async uploadFile(agentId: string, payload: { name: string; mimeType: string; content: string; isKnowledgeBase?: boolean }) {
    return request<{ file: ApiFile }>(`/agents/${agentId}/files`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },


  async getAgentFiles(agentId: string) {
    return request<{ files: ApiFile[] }>(`/agents/${agentId}/files`);
  },

  async deleteFile(agentId: string, fileId: string) {
    return request<void>(`/agents/${agentId}/files/${fileId}`, { method: 'DELETE' });
  },

  async generateSummary(agentId: string) {
    return request<{ file: ApiFile }>(`/agents/${agentId}/summary`, { method: 'POST' });
  },

  async getSummaryFiles(agentId: string, projectId?: string) {
    const query = projectId ? `?projectId=${projectId}` : '';
    return request<{ files: ApiFile[] }>(`/agents/${agentId}/files/summary${query}`);
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
};


