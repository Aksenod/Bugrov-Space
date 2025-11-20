const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api').replace(/\/$/, '');
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
    return data?.error ?? response.statusText;
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
    throw new Error(message || 'Request failed');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export interface ApiUser {
  id: string;
  name: string;
  email: string;
}

export interface ApiFile {
  id: string;
  name: string;
  mimeType: string;
  content: string;
  createdAt: string;
}

export interface ApiAgent {
  id: string;
  name: string;
  description: string;
  systemInstruction: string;
  summaryInstruction: string;
  model: string;
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

  async register(payload: { name: string; email: string; password: string }) {
    return request<{ token: string; user: ApiUser; agents: ApiAgent[] }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async login(payload: { email: string; password: string }) {
    return request<{ token: string; user: ApiUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async resetPassword(payload: { email: string; newPassword: string }) {
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

  async uploadFile(agentId: string, payload: { name: string; mimeType: string; content: string }) {
    return request<{ file: ApiFile }>(`/agents/${agentId}/files`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async deleteFile(agentId: string, fileId: string) {
    return request<void>(`/agents/${agentId}/files/${fileId}`, { method: 'DELETE' });
  },

  async generateSummary(agentId: string) {
    return request<{ file: ApiFile }>(`/agents/${agentId}/summary`, { method: 'POST' });
  },
};


