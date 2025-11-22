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
    // Если error - это объект, извлекаем строку из него
    if (data?.error) {
      if (typeof data.error === 'string') {
        return data.error;
      }
      if (typeof data.error === 'object') {
        // Если это объект с полями, пытаемся извлечь сообщение
        if (data.error.message) {
          return data.error.message;
        }
        if (data.error._errors && Array.isArray(data.error._errors)) {
          return data.error._errors.join(', ');
        }
        // Если это объект валидации Zod
        if (data.error.issues && Array.isArray(data.error.issues)) {
          return data.error.issues.map((err: any) => {
            if (err.path && err.path.length > 0) {
              return `${err.path.join('.')}: ${err.message}`;
            }
            return err.message;
          }).join(', ');
        }
        // В крайнем случае - JSON строка
        return JSON.stringify(data.error);
      }
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
}

export interface ApiFile {
  id: string;
  name: string;
  mimeType: string;
  content: string;
  agentId: string;
  isKnowledgeBase?: boolean;
  dslContent?: string;
  verstkaContent?: string;
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
  files: ApiFile[];
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

  async getAgents() {
    return request<{ agents: ApiAgent[] }>('/agents');
  },

  async createAgent(payload: {
    name: string;
    description?: string;
    systemInstruction?: string;
    summaryInstruction?: string;
    model?: string;
    role?: string;
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

  async sendMessage(agentId: string, text: string) {
    return request<{ messages: ApiMessage[] }>(`/agents/${agentId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },

  async uploadFile(agentId: string, payload: { name: string; mimeType: string; content: string; isKnowledgeBase?: boolean }) {
    return request<{ file: ApiFile }>(`/agents/${agentId}/files`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async deleteProjectFile(fileId: string) {
    return request<void>(`/agents/files/${fileId}`, { method: 'DELETE' });
  },

  async deleteFile(agentId: string, fileId: string) {
    return request<void>(`/agents/${agentId}/files/${fileId}`, { method: 'DELETE' });
  },

  async generateSummary(agentId: string) {
    return request<{ file: ApiFile }>(`/agents/${agentId}/summary`, { method: 'POST' });
  },

  async getSummaryFiles(agentId: string) {
    return request<{ files: ApiFile[] }>(`/agents/${agentId}/files/summary`);
  },

  async generateDocumentResult(agentId: string, fileId: string, role: 'dsl' | 'verstka') {
    return request<{ file: ApiFile }>(`/agents/${agentId}/files/${fileId}/generate-result`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  },
};


