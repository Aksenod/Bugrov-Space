/**
 * Типы для кастомных хуков
 */

import { User, Project, ProjectType, Agent, Message, UploadedFile } from '../types';

/**
 * Типы для useAuth
 */
export interface UseAuthReturn {
  token: string | null;
  user: User | null;
  authError: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  resetPassword: (username: string, newPassword: string) => Promise<void>;
  clearError: () => void;
  // Внутренний метод для bootstrap
  loadUser: () => Promise<void>;
}

/**
 * Типы для useProjects
 */
export interface UseProjectsReturn {
  projects: Project[];
  activeProjectId: string | null;
  projectTypes: ProjectType[];
  isLoading: boolean;
  createProject: (name: string, projectTypeId: string, description?: string) => Promise<Project>;
  updateProject: (projectId: string, name?: string, description?: string) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  selectProject: (projectId: string | null) => void;
  getProject: (projectId: string) => Project | undefined;
  // Внутренние методы для использования в bootstrap
  loadProjects: () => Promise<void>;
  loadProjectTypes: () => Promise<void>;
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  setProjectTypes: React.Dispatch<React.SetStateAction<ProjectType[]>>;
}

/**
 * Типы для useAgents
 */
export interface UseAgentsReturn {
  agents: Agent[];
  activeAgentId: string | null;
  isLoading: boolean;
  activeAgent: Agent | undefined;
  reloadAgents: () => Promise<void>;
  selectAgent: (agentId: string) => void;
  getAgent: (agentId: string) => Agent | undefined;
  // Внутренние методы для использования в bootstrap
  loadAgents: (projectId: string) => Promise<void>;
  setAgents: React.Dispatch<React.SetStateAction<Agent[]>>;
  setActiveAgentId: React.Dispatch<React.SetStateAction<string | null>>;
}

/**
 * Типы для useChat
 */
export interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  sendMessage: (text: string) => Promise<void>;
  clearChat: () => Promise<void>;
  ensureMessagesLoaded: (agentId: string) => Promise<void>;
  loadedAgents: Set<string>;
  // Внутренние методы для использования в bootstrap
  chatHistories: Record<string, Message[]>;
  setChatHistories: (histories: Record<string, Message[]>) => void;
  clearAllChatHistories: () => void;
  clearLoadedAgents: () => void;
}

/**
 * Типы для useDocuments
 */
export interface UseDocumentsReturn {
  documents: UploadedFile[];
  isLoading: boolean;
  isGeneratingSummary: boolean;
  summarySuccess: boolean;
  generateSummary: () => Promise<void>;
  uploadFile: (file: File) => Promise<void>;
  uploadFiles: (files: FileList | File[]) => Promise<void>;
  removeFile: (fileId: string) => Promise<void>;
  ensureSummaryLoaded: () => Promise<void>;
}

/**
 * Типы для useDialogs
 */
export interface UseDialogsReturn {
  // Confirm Dialog
  showConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    variant?: 'danger' | 'warning' | 'info'
  ) => void;
  confirmDialog: {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  };
  closeConfirm: () => void;
  
  // Alert Dialog
  showAlert: (
    message: string,
    title?: string,
    variant?: 'success' | 'error' | 'info' | 'warning',
    duration?: number
  ) => void;
  alertDialog: {
    isOpen: boolean;
    title?: string;
    message: string;
    variant?: 'success' | 'error' | 'info' | 'warning';
  };
  closeAlert: () => void;
}

/**
 * Типы для useBootstrap
 */
export interface UseBootstrapReturn {
  isBootstrapping: boolean;
  bootstrap: () => Promise<void>;
  hasBootstrapped: boolean;
  reset: () => void;
}

/**
 * Типы для useRouting
 */
export interface RouteState {
  isLandingOpen: boolean;
  isCreativeLandingOpen: boolean;
  isUltraLandingOpen: boolean;
  isAdminOpen: boolean;
  isOfferOpen: boolean;
  isPrivacyOpen: boolean;
  isRequisitesOpen: boolean;
  prototypeHash: string | null;
  adminInitialAgentId: string | undefined;
}

export interface UseRoutingReturn {
  routeState: RouteState;
  navigateTo: (route: string) => void;
  setRouteState: (state: Partial<RouteState>) => void;
}

/**
 * Типы для useErrorHandler
 */
export interface UseErrorHandlerReturn {
  handleError: (error: unknown, context?: string) => void;
  getErrorMessage: (error: unknown) => string;
  translateErrorMessage: (message: string) => string;
}

/**
 * Типы для Chat Reducer (useChat)
 */
export interface ChatState {
  chatHistories: Record<string, Message[]>;
  isLoading: boolean;
  loadedAgents: Set<string>;
}

export type ChatAction =
  | { type: 'SET_MESSAGES'; payload: { agentId: string; messages: Message[] } }
  | { type: 'ADD_MESSAGE'; payload: { agentId: string; message: Message } }
  | { type: 'CLEAR_MESSAGES'; payload: { agentId: string } }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'MARK_LOADED'; payload: string }
  | { type: 'CLEAR_LOADED'; payload: string }
  | { type: 'CLEAR_ALL_HISTORIES' };

