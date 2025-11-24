import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Settings, Trash2, Menu, AlertCircle, Zap, Cpu, Brain } from 'lucide-react';

import { Message, Role, LLMModel, MODELS, UploadedFile, Agent, User, Project, ProjectType } from './types';
import { MessageBubble } from './components/MessageBubble';
import { MessageSkeleton } from './components/MessageSkeleton';
import { ChatInput } from './components/ChatInput';
import { SettingsPanel } from './components/SettingsPanel';
import { AgentSidebar } from './components/AgentSidebar';
import { ProjectDocumentsModal } from './components/ProjectDocumentsModal';
import { AuthPage } from './components/AuthPage';
import { AdminPage } from './components/AdminPage';
import { CreateProjectDialog } from './components/CreateProjectDialog';
import { EditProjectDialog } from './components/EditProjectDialog';
import { ConfirmDialog } from './components/ConfirmDialog';
import { AlertDialog } from './components/AlertDialog';
import { api, ApiAgent, ApiFile, ApiMessage, ApiUser, ApiProject, ApiProjectTypeAgent } from './services/api';

const FILE_SIZE_LIMIT = 2 * 1024 * 1024;
const COLOR_PRESETS = ['indigo', 'emerald', 'amber', 'purple', 'rose', 'cyan', 'blue'];

const readFileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const mapFile = (file: ApiFile): UploadedFile => ({
  id: file.id,
  name: file.name,
  type: file.mimeType,
  data: file.content,
  agentId: file.agentId,
});

const pickColor = (id: string) => {
  const hash = Array.from(id).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return COLOR_PRESETS[hash % COLOR_PRESETS.length];
};

const mapAgent = (agent: ApiAgent): Agent => ({
  id: agent.id,
  name: agent.name,
  description: agent.description,
  systemInstruction: agent.systemInstruction,
  summaryInstruction: agent.summaryInstruction,
  files: (agent.files ?? []).filter(file => !file.name.startsWith('Summary')).map(mapFile),
  avatarColor: pickColor(agent.id),
  model: (agent.model as LLMModel) || LLMModel.GPT51,
  role: agent.role,
  order: agent.order ?? 0,
});

const sortAgents = (agentList: Agent[]) =>
  [...agentList].sort((a, b) => {
    if (a.order === b.order) {
      return a.name.localeCompare(b.name);
    }
    return a.order - b.order;
});

const mapMessage = (message: ApiMessage): Message => ({
  id: message.id,
  role: message.role === 'USER' ? Role.USER : Role.MODEL,
  text: message.text,
  timestamp: new Date(message.createdAt),
});

const mapUser = (user: ApiUser): User => ({
  id: user.id,
  username: user.username,
  role: user.role,
});

const mapProjectTypeAgent = (agent: ApiProjectTypeAgent): Agent => ({
  id: agent.id,
  name: agent.name,
  description: agent.description,
  systemInstruction: agent.systemInstruction,
  summaryInstruction: agent.summaryInstruction,
  files: [], // Агенты типов проектов не имеют файлов
  avatarColor: pickColor(agent.id),
  model: (agent.model as LLMModel) || LLMModel.GPT51,
  role: agent.role,
  order: agent.order,
});

const mapProject = (project: ApiProject): Project => ({
  id: project.id,
  name: project.name,
  description: project.description,
  projectTypeId: project.projectTypeId,
  projectType: project.projectType ? {
    id: project.projectType.id,
    name: project.projectType.name,
    createdAt: project.projectType.createdAt,
    updatedAt: project.projectType.updatedAt,
  } : undefined,
  agentCount: project.agentCount,
  createdAt: project.createdAt,
  updatedAt: project.updatedAt,
});

export default function App() {
  const [authToken, setAuthToken] = useState(() => api.getToken());
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [projectTypeAgents, setProjectTypeAgents] = useState<Agent[]>([]);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [chatHistories, setChatHistories] = useState<Record<string, Message[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summarySuccess, setSummarySuccess] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [summaryDocuments, setSummaryDocuments] = useState<Record<string, UploadedFile[]>>({});
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    variant?: 'success' | 'error' | 'info' | 'warning';
  }>({
    isOpen: false,
    message: '',
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadedAgentsRef = useRef(new Set<string>());
  const loadedSummaryRef = useRef(new Set<string>());
  const previousAgentsRef = useRef<Agent[] | null>(null);

  const activeAgent = useMemo(() => {
    const allAgents = [...projectTypeAgents, ...agents];
    if (!activeAgentId) {
      return allAgents[0];
    }
    return allAgents.find((agent) => agent.id === activeAgentId) ?? allAgents[0];
  }, [activeAgentId, agents, projectTypeAgents]);

  const messages = activeAgent ? chatHistories[activeAgent.id] ?? [] : [];
  // Документы проекта общие для всех агентов - всегда используем ключ 'all'
  const projectDocuments = summaryDocuments['all'] ?? [];
  
  // Логирование для диагностики
  useEffect(() => {
    if (activeAgent) {
      console.log(`[Frontend] Active agent changed: ${activeAgent.name} (${activeAgent.id})`);
      console.log(`[Frontend] Project documents count: ${projectDocuments.length}`);
      console.log(`[Frontend] Project documents:`, projectDocuments.map(d => ({
        id: d.id,
        name: d.name,
        agentId: d.agentId,
      })));
    }
  }, [activeAgent?.id, projectDocuments.length]);
  const resolvedModel = (activeAgent?.model as LLMModel) || LLMModel.GPT51;
  const isMiniModel = resolvedModel === LLMModel.GPT4O_MINI;
  const isUltraModel = resolvedModel === LLMModel.GPT51;
  const isGPT5Mini = false; // GPT5_MINI больше не существует
  const modelBadgeClass = isUltraModel
    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
    : isGPT5Mini
      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
      : isMiniModel
        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
        : 'bg-pink-500/10 border-pink-500/30 text-pink-400';
  const ModelBadgeIcon = isUltraModel ? Brain : isMiniModel ? Zap : Cpu;
  const modelBadgeLabel =
    MODELS.find((m) => m.id === resolvedModel)?.name ?? 'GPT-5.1';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeAgent?.id, isLoading]);

  const handleLogout = useCallback(() => {
    api.clearToken();
    setAuthToken(null);
    setCurrentUser(null);
    setAgents([]);
    setProjectTypeAgents([]);
    setActiveAgentId(null);
    setChatHistories({});
    loadedAgentsRef.current.clear();
    loadedSummaryRef.current.clear();
    setSummaryDocuments({});
  }, []);

  const bootstrap = useCallback(async () => {
      if (!api.getToken()) {
      setCurrentUser(null);
      setProjects([]);
      setActiveProjectId(null);
      setAgents([]);
      setProjectTypeAgents([]);
      setActiveAgentId(null);
      return;
    }

    setIsBootstrapping(true);
    try {
      // Загружаем пользователя, проекты и типы проектов параллельно
      const [{ user }, { projects: apiProjects }, { projectTypes: apiProjectTypes }] = await Promise.all([
        api.getCurrentUser(),
        api.getProjects(),
        api.getProjectTypes().catch(() => ({ projectTypes: [] })), // Если ошибка - пустой массив
      ]);
      setCurrentUser(mapUser(user));
      
      // Кешируем типы проектов для использования в диалогах
      const mappedProjectTypes = apiProjectTypes.map((t: any) => ({
        id: t.id,
        name: t.name,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      }));
      setProjectTypes(mappedProjectTypes);
      
      const mappedProjects = apiProjects.map(mapProject);
      setProjects(mappedProjects);
      
      // Выбираем активный проект (последний использованный или первый)
      const lastUsedProjectId = localStorage.getItem('lastUsedProjectId');
      const projectToSelect = lastUsedProjectId && mappedProjects.find(p => p.id === lastUsedProjectId)
        ? lastUsedProjectId
        : mappedProjects[0]?.id ?? null;
      
      setActiveProjectId(projectToSelect);
      
      // Загружаем агентов выбранного проекта
      if (projectToSelect && projectToSelect.trim() !== '') {
        localStorage.setItem('lastUsedProjectId', projectToSelect);
        try {
          const { agents: apiAgents, projectTypeAgents: apiProjectTypeAgents } = await api.getAgents(projectToSelect);
          const mappedAgents = sortAgents(apiAgents.map(mapAgent));
          const mappedProjectTypeAgents = apiProjectTypeAgents 
            ? sortAgents(apiProjectTypeAgents.map(mapProjectTypeAgent))
            : [];
          setAgents(mappedAgents);
          setProjectTypeAgents(mappedProjectTypeAgents);
          
          // Выбираем активного агента (приоритет обычным агентам)
          const allAgents = [...mappedProjectTypeAgents, ...mappedAgents];
          setActiveAgentId((prev) => {
            if (prev && allAgents.some((agent) => agent.id === prev)) {
              return prev;
            }
            // Приоритет обычным агентам проекта
            return mappedAgents[0]?.id ?? mappedProjectTypeAgents[0]?.id ?? null;
          });
        } catch (error) {
          console.error('Failed to load agents in bootstrap', error);
          setAgents([]);
          setProjectTypeAgents([]);
          setActiveAgentId(null);
        }
      } else {
        setAgents([]);
        setProjectTypeAgents([]);
        setActiveAgentId(null);
      }
      
      loadedAgentsRef.current.clear();
      loadedSummaryRef.current.clear();
      setChatHistories({});
      setSummaryDocuments({});
    } catch (error: any) {
      console.error('Bootstrap failed', error);
      
      // Проверяем тип ошибки
      const isAuthError = error?.status === 401 || error?.status === 403;
      const isDbError = error?.status === 503 || error?.status === 500 || 
                       error?.message?.includes('Database') || 
                       error?.message?.includes('Can\'t reach database');
      
      // Если ошибка авторизации - выкидываем пользователя
      if (isAuthError) {
        api.clearToken();
        setAuthToken(null);
        setCurrentUser(null);
        setProjects([]);
        setActiveProjectId(null);
        setAgents([]);
        setProjectTypeAgents([]);
        setActiveAgentId(null);
        setChatHistories({});
        loadedAgentsRef.current.clear();
        loadedSummaryRef.current.clear();
        setSummaryDocuments({});
      } else if (isDbError) {
        // Если ошибка базы данных - оставляем пользователя залогиненным, но с пустыми данными
        // Пользователь может попробовать обновить страницу позже
        console.warn('Database temporarily unavailable, keeping user logged in');
        setProjects([]);
        setActiveProjectId(null);
        setAgents([]);
        setProjectTypeAgents([]);
        setActiveAgentId(null);
        setChatHistories({});
        loadedAgentsRef.current.clear();
        loadedSummaryRef.current.clear();
        setSummaryDocuments({});
      } else {
        // Для других ошибок - также оставляем пользователя залогиненным
        setProjects([]);
        setActiveProjectId(null);
        setAgents([]);
        setProjectTypeAgents([]);
        setActiveAgentId(null);
        setChatHistories({});
        loadedAgentsRef.current.clear();
        loadedSummaryRef.current.clear();
        setSummaryDocuments({});
      }
    } finally {
      setIsBootstrapping(false);
    }
  }, []);

  useEffect(() => {
    if (authToken) {
      bootstrap();
    } else {
      handleLogout();
    }
  }, [authToken, bootstrap, handleLogout]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!currentUser || !activeAgent) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K - открыть настройки агента
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSettingsOpen(true);
      }
      
      // Escape - закрыть модальные окна
      if (e.key === 'Escape') {
        if (isSettingsOpen) {
          setIsSettingsOpen(false);
        }
        if (isDocsOpen) {
          setIsDocsOpen(false);
        }
        if (isSidebarOpen) {
          setIsSidebarOpen(false);
        }
      }
      
      // Cmd/Ctrl + / - открыть документы
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setIsDocsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentUser, activeAgent, isSettingsOpen, isDocsOpen, isSidebarOpen]);

  const ensureMessagesLoaded = useCallback(
    async (agentId: string) => {
      if (!agentId || loadedAgentsRef.current.has(agentId)) {
        return;
      }
      loadedAgentsRef.current.add(agentId);
      try {
        const { messages: apiMessages } = await api.getMessages(agentId);
        setChatHistories((prev) => ({
          ...prev,
          [agentId]: apiMessages.map(mapMessage),
        }));
      } catch (error) {
        console.error('Failed to load messages', error);
      }
    },
    [],
  );

  // Оптимизация: загружаем сообщения только после завершения bootstrap
  // и только для активного агента (не для всех сразу)
  useEffect(() => {
    if (activeAgent && !isBootstrapping) {
      // Небольшая задержка, чтобы интерфейс успел отрендериться
      const timer = setTimeout(() => {
        ensureMessagesLoaded(activeAgent.id);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeAgent?.id, isBootstrapping, ensureMessagesLoaded]);

  const ensureSummaryLoaded = useCallback(
    async (agentId: string) => {
      if (!agentId) return;
      
      // Документы проекта общие для всех агентов - загружаем с ключом 'all'
      const PROJECT_DOCS_KEY = 'all';
      
      // УБИРАЕМ проверку кеша - всегда загружаем документы при переключении агента
      // чтобы гарантировать, что видны ВСЕ документы всех агентов
      // Проверка кеша блокировала перезагрузку при переключении агента
      
      // Помечаем как загружаемый (но не проверяем, был ли уже загружен)
      loadedSummaryRef.current.add(PROJECT_DOCS_KEY);
      
      try {
        // Используем agentId для запроса, но бэкенд вернет все файлы пользователя
        console.log(`[Frontend] Loading project documents for agent: ${agentId}`);
        const { files } = await api.getSummaryFiles(agentId);
        console.log(`[Frontend] ✅ Loaded project documents (ALL files from all agents):`, files.length, 'files');
        console.log(`[Frontend] File details:`, files.map(f => ({
          id: f.id,
          name: f.name,
          agentId: f.agentId,
        })));
        // Сохраняем под ключом 'all' для всех агентов - это ВСЕ документы всех агентов
        setSummaryDocuments((prev) => {
          const mapped = files.map(mapFile);
          console.log(`[Frontend] Setting summaryDocuments['all'] with ${mapped.length} files`);
          return {
            ...prev,
            [PROJECT_DOCS_KEY]: mapped,
          };
        });
      } catch (error: any) {
        // Если 404 - просто нет файлов, это нормально, устанавливаем пустой массив
        // Проверяем статус напрямую или по сообщению
        if (error?.status === 404 || error?.message?.includes('404') || error?.message?.includes('Not Found')) {
          console.log(`[Frontend] No project documents found (404 is normal if no files exist)`);
          setSummaryDocuments((prev) => ({
            ...prev,
            [PROJECT_DOCS_KEY]: [],
          }));
          // Оставляем в кеше, чтобы не повторять запрос
          return;
        }
        // Для других ошибок убираем из кеша, чтобы можно было повторить
        loadedSummaryRef.current.delete(PROJECT_DOCS_KEY);
        console.error('[Frontend] Failed to load project documents:', error);
      }
    },
    [],
  );

  // Оптимизация: загружаем документы проекта только после завершения bootstrap
  // и только для активного агента (не для всех сразу)
  useEffect(() => {
    // Не загружаем во время bootstrap
    if (isBootstrapping || !activeAgent?.id) {
      return;
    }

    // Документы проекта общие для всех агентов - загружаем при переключении агента
    // Но с небольшой задержкой, чтобы интерфейс успел отрендериться
    const timer = setTimeout(() => {
      // Сбрасываем кеш, чтобы гарантировать загрузку всех документов всех агентов
      loadedSummaryRef.current.delete('all');
      console.log(`[Frontend] useEffect: Переключение на агента ${activeAgent.id}, сброс кеша и загрузка документов`);
      ensureSummaryLoaded(activeAgent.id);
    }, 200); // Небольшая задержка для лучшего UX

    return () => clearTimeout(timer);
  }, [isBootstrapping, activeAgent?.id, ensureSummaryLoaded]);

  const getErrorMessage = (error: any): string => {
    if (typeof error === 'string') {
      return error;
    }
    if (error?.message && typeof error.message === 'string') {
      return error.message;
    }
    if (error?.error && typeof error.error === 'string') {
      return error.error;
    }
    if (typeof error === 'object' && error !== null) {
      // Если это объект валидации Zod с issues
      if (error.issues && Array.isArray(error.issues)) {
        return error.issues.map((err: any) => {
          if (err.path && err.path.length > 0) {
            return `${err.path.join('.')}: ${err.message}`;
          }
          return err.message;
        }).join(', ');
      }
      // Если это объект с _errors (Zod flatten)
      if (error._errors && Array.isArray(error._errors)) {
        return error._errors.join(', ');
      }
      // Пытаемся найти строковое сообщение в объекте
      const message = JSON.stringify(error);
      if (message !== '{}' && message.length < 200) {
        return message;
      }
    }
    return 'Произошла неизвестная ошибка';
  };

  const translateErrorMessage = (message: string): string => {
    const translations: Record<string, string> = {
      'Invalid credentials': 'Неверное имя пользователя или пароль',
      'Username already taken': 'Имя пользователя уже занято',
      'User not found': 'Пользователь не найден',
      'Unauthorized': 'Не авторизован',
      'Forbidden: Admin access required': 'Доступ запрещен: требуется права администратора',
      'Validation error:': 'Ошибка валидации:',
      'username: String must contain at least 1 character(s)': 'Имя пользователя не может быть пустым',
      'password: String must contain at least 6 character(s)': 'Пароль должен содержать минимум 6 символов',
      'newPassword: String must contain at least 6 character(s)': 'Новый пароль должен содержать минимум 6 символов',
      'Database error': 'Ошибка базы данных',
      'Database connection error': 'Ошибка подключения к базе данных',
      'Database is temporarily unavailable. Please try again later.': 'База данных временно недоступна. Попробуйте позже.',
      'A database error occurred. Please try again later.': 'Произошла ошибка базы данных. Попробуйте позже.',
      'Cannot reach database': 'Не удается подключиться к базе данных',
      'Server has closed the connection': 'Соединение с базой данных было закрыто',
    };

    // Проверяем точные совпадения
    if (translations[message]) {
      return translations[message];
    }

    // Обрабатываем ошибки валидации с несколькими полями
    if (message.includes('Validation error:')) {
      let translated = message.replace('Validation error:', 'Ошибка валидации:');
      translated = translated.replace(/username: String must contain at least 1 character\(s\)/g, 'Имя пользователя не может быть пустым');
      translated = translated.replace(/password: String must contain at least 6 character\(s\)/g, 'Пароль должен содержать минимум 6 символов');
      translated = translated.replace(/newPassword: String must contain at least 6 character\(s\)/g, 'Новый пароль должен содержать минимум 6 символов');
      return translated;
    }

    // Проверяем частичные совпадения
    for (const [key, value] of Object.entries(translations)) {
      if (message.includes(key)) {
        return message.replace(key, value);
      }
    }

    // Если сообщение содержит только техническую информацию, возвращаем понятное сообщение
    if (message.includes('Request failed') || message.includes('Network')) {
      return 'Ошибка соединения. Проверьте подключение к интернету.';
    }

    return message;
  };

  // Helper functions for dialogs
  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    variant: 'danger' | 'warning' | 'info' = 'danger'
  ) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
      variant,
    });
  };

  const showAlert = (
    message: string,
    title?: string,
    variant: 'success' | 'error' | 'info' | 'warning' = 'info',
    duration: number = 0
  ) => {
    setAlertDialog({
      isOpen: true,
      message,
      title,
      variant,
    });
    if (duration > 0) {
      setTimeout(() => {
        setAlertDialog(prev => ({ ...prev, isOpen: false }));
      }, duration);
    }
  };

  const handleLogin = async (username: string, password: string) => {
    setAuthError(null);
    const payload = {
      username: username.trim().toLowerCase(),
      password: password.trim(),
    };
    try {
      const response = await api.login(payload);
      api.setToken(response.token);
      setAuthToken(response.token);
      setCurrentUser(mapUser(response.user));
      await bootstrap();
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      const translatedMessage = translateErrorMessage(errorMessage);
      setAuthError(translatedMessage);
      throw error;
    }
  };

  const handleRegister = async (username: string, password: string) => {
    setAuthError(null);
    try {
      const response = await api.register({
        username: username.trim().toLowerCase(),
        password: password.trim(),
      });
      api.setToken(response.token);
      setAuthToken(response.token);
      setCurrentUser(mapUser(response.user));
      
      // После регистрации у пользователя нет проектов - он должен создать первый
      setProjects([]);
      setActiveProjectId(null);
      setAgents([]);
      setProjectTypeAgents([]);
      setActiveAgentId(null);
      loadedAgentsRef.current.clear();
      loadedSummaryRef.current.clear();
      setChatHistories({});
      setSummaryDocuments({});
      
      // Пытаемся загрузить данные (но не критично, если не получится)
      try {
        await bootstrap();
      } catch (bootstrapError: any) {
        // Если bootstrap не удался из-за временной проблемы с БД - не критично
        // Пользователь уже залогинен и может попробовать обновить страницу
        console.warn('Bootstrap after registration failed, but user is logged in', bootstrapError);
      }
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      const translatedMessage = translateErrorMessage(errorMessage);
      setAuthError(translatedMessage);
      throw error;
    }
  };

  const handleResetPassword = async (username: string, newPassword: string) => {
    setAuthError(null);
    try {
      await api.resetPassword({
        username: username.trim().toLowerCase(),
        newPassword: newPassword.trim(),
      });
    } catch (error: any) {
      const errorMessage = getErrorMessage(error);
      const translatedMessage = translateErrorMessage(errorMessage);
      setAuthError(translatedMessage);
      throw error;
    }
  };

  const handleReorderAgents = useCallback(async (newOrderIds: string[]) => {
    setAgents((prev) => {
      if (prev.length !== newOrderIds.length) {
        return prev;
      }
      previousAgentsRef.current = prev;
      const map = new Map(prev.map((agent) => [agent.id, agent]));
      const reordered: Agent[] = [];
      for (const id of newOrderIds) {
        const agent = map.get(id);
        if (!agent) {
          return prev;
        }
        reordered.push(agent);
      }
      return reordered.map((agent, index) => ({
        ...agent,
        order: index,
      }));
    });

    try {
      await api.reorderAgents(newOrderIds.map((id, index) => ({ id, order: index })));
    } catch (error) {
      console.error('Не удалось сохранить порядок агентов', error);
      if (previousAgentsRef.current) {
        setAgents(previousAgentsRef.current);
      }
    }
  }, []);

  const handleSendMessage = async (text: string) => {
    if (!activeAgent || !text.trim() || isLoading) return;

    setIsLoading(true);
    setSummarySuccess(false);

    // Создаем временное сообщение пользователя (показываем сразу)
    const tempUserMessageId = `temp-user-${Date.now()}`;
    const tempUserMessage: Message = {
      id: tempUserMessageId,
      role: Role.USER,
      text: text.trim(),
      timestamp: new Date(),
    };

    // Создаем временное сообщение агента с индикатором загрузки
    const loadingMessageId = `loading-${Date.now()}`;
    const loadingMessage: Message = {
      id: loadingMessageId,
      role: Role.MODEL,
      text: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    // Добавляем оба временных сообщения сразу после отправки
    setChatHistories((prev) => ({
      ...prev,
      [activeAgent.id]: [
        ...(prev[activeAgent.id] ?? []),
        tempUserMessage,
        loadingMessage,
      ],
    }));

    // Прокручиваем к индикатору загрузки
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    try {
      const response = await api.sendMessage(activeAgent.id, text.trim());
      const newMessages = response.messages.map(mapMessage);
      
      // Заменяем временные сообщения на реальные сообщения из API
      setChatHistories((prev) => {
        const currentMessages = prev[activeAgent.id] ?? [];
        // Удаляем временные сообщения (пользователя и загрузки)
        const messagesWithoutTemp = currentMessages.filter(
          (msg) => msg.id !== tempUserMessageId && msg.id !== loadingMessageId
        );
        
        // Добавляем реальные сообщения из API (они содержат корректные ID из базы данных)
        return {
          ...prev,
          [activeAgent.id]: [...messagesWithoutTemp, ...newMessages],
        };
      });
    } catch (error: any) {
      console.error('Chat error', error);
      
      // Удаляем временное сообщение загрузки и добавляем сообщение об ошибке
      // Сообщение пользователя оставляем как есть
      setChatHistories((prev) => {
        const currentMessages = prev[activeAgent.id] ?? [];
        // Удаляем только временное сообщение загрузки, сообщение пользователя оставляем
        const messagesWithoutLoading = currentMessages.filter(
          (msg) => msg.id !== loadingMessageId
        );
        
        const errorMessage = error?.message || 'Ошибка генерации. Попробуйте позже.';
        
        return {
          ...prev,
          [activeAgent.id]: [
            ...messagesWithoutLoading,
            {
              id: `error-${Date.now()}`,
              role: Role.MODEL,
              text: errorMessage,
              timestamp: new Date(),
              isError: true,
            },
          ],
        };
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (!activeAgent) return;
    showConfirm(
      'Очистить историю чата?',
      'Все сообщения в этом чате будут удалены.\nЭто действие нельзя отменить.',
      async () => {
        try {
          await api.clearMessages(activeAgent.id);
          setChatHistories((prev) => ({ ...prev, [activeAgent.id]: [] }));
          loadedAgentsRef.current.delete(activeAgent.id);
          setSummarySuccess(false);
          showAlert('История чата успешно очищена', undefined, 'success', 3000);
        } catch (error: any) {
          console.error('Failed to clear chat', error);
          showAlert(`Не удалось очистить чат: ${error?.message || 'Неизвестная ошибка'}`, 'Ошибка', 'error', 5000);
        }
      },
      'warning'
    );
  };

  const handleGenerateSummary = async () => {
    if (!activeAgent || messages.length < 1) return;
    setIsGeneratingSummary(true);
    try {
      console.log('[Frontend] handleGenerateSummary called:', {
        agentId: activeAgent.id,
        agentName: activeAgent.name,
        messagesCount: messages.length,
      });
      
      const { file } = await api.generateSummary(activeAgent.id);
      
      console.log('[Frontend] Summary generated successfully:', {
        fileId: file.id,
        fileName: file.name,
        agentId: file.agentId,
      });
      
      const uploaded = mapFile(file);
      // Добавляем созданный файл напрямую в summaryDocuments (документы проекта общие для всех агентов)
      setSummaryDocuments((prev) => {
        const updated = {
          ...prev,
          'all': [uploaded, ...(prev['all'] ?? [])],
        };
        console.log('[Frontend] Updated summaryDocuments:', {
          totalFiles: updated['all'].length,
          newFile: uploaded.name,
        });
        return updated;
      });
      // Очищаем кеш загрузки для этого агента, чтобы при следующем переключении файлы перезагрузились
      // Но не очищаем сейчас, так как мы уже добавили файл вручную
      setSummarySuccess(true);
      setTimeout(() => setSummarySuccess(false), 3000);
    } catch (error: any) {
      console.error('[Frontend] Summary generation failed:', error);
      console.error('[Frontend] Error details:', {
        message: error?.message,
        status: error?.status,
        stack: error?.stack,
      });
      showAlert(`Не удалось создать саммари: ${error?.message || 'Неизвестная ошибка'}`, 'Ошибка', 'error', 5000);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleAddAgent = async () => {
    if (!activeProjectId) {
      showAlert('Сначала выберите или создайте проект', 'warning');
      return;
    }
    try {
      const response = await api.createAgent({
        name: 'Новый Агент',
        description: 'Специализированная роль',
        systemInstruction: 'Ты полезный помощник.',
        summaryInstruction: 'Сделай краткий вывод.',
        model: LLMModel.GPT51,
        role: '',
        projectId: activeProjectId,
      });
      const mapped = mapAgent(response.agent);
      setAgents((prev) => sortAgents([...prev, mapped]));
      setActiveAgentId(mapped.id);
      setIsSidebarOpen(false);
      setIsSettingsOpen(true);
    } catch (error) {
      console.error('Failed to create agent', error);
      showAlert('Ошибка при создании агента', 'error');
    }
  };

  const handleSelectProject = useCallback(async (projectId: string) => {
    setActiveProjectId(projectId);
    localStorage.setItem('lastUsedProjectId', projectId);
    try {
      const { agents: apiAgents, projectTypeAgents: apiProjectTypeAgents } = await api.getAgents(projectId);
      const mappedAgents = sortAgents(apiAgents.map(mapAgent));
      const mappedProjectTypeAgents = apiProjectTypeAgents 
        ? sortAgents(apiProjectTypeAgents.map(mapProjectTypeAgent))
        : [];
      setAgents(mappedAgents);
      setProjectTypeAgents(mappedProjectTypeAgents);
      
      // Приоритет обычным агентам проекта
      const allAgents = [...mappedProjectTypeAgents, ...mappedAgents];
      setActiveAgentId(mappedAgents[0]?.id ?? mappedProjectTypeAgents[0]?.id ?? null);
      loadedAgentsRef.current.clear();
      loadedSummaryRef.current.clear();
      setChatHistories({});
      setSummaryDocuments({});
    } catch (error) {
      console.error('Failed to load agents for project', error);
      showAlert('Ошибка при загрузке агентов проекта', 'error');
    }
  }, []);

  const handleCreateProject = useCallback(async (name: string, projectTypeId: string, description?: string) => {
    try {
      const { project } = await api.createProject({ name, projectTypeId, description });
      const mappedProject = mapProject(project);
      setProjects((prev) => [...prev, mappedProject]);
      setActiveProjectId(mappedProject.id);
      localStorage.setItem('lastUsedProjectId', mappedProject.id);
      
      // Загружаем агентов проекта (их может не быть, но это нормально)
      try {
        const { agents: apiAgents, projectTypeAgents: apiProjectTypeAgents } = await api.getAgents(mappedProject.id);
        const mappedAgents = sortAgents(apiAgents.map(mapAgent));
        const mappedProjectTypeAgents = apiProjectTypeAgents 
          ? sortAgents(apiProjectTypeAgents.map(mapProjectTypeAgent))
          : [];
        setAgents(mappedAgents);
        setProjectTypeAgents(mappedProjectTypeAgents);
        // Приоритет обычным агентам проекта, но также проверяем агентов типа проекта
        setActiveAgentId(mappedAgents[0]?.id ?? mappedProjectTypeAgents[0]?.id ?? null);
      } catch (error) {
        // Если агентов нет - это нормально, просто оставляем пустой список
        console.log('No agents in new project, this is expected');
        setAgents([]);
        setActiveAgentId(null);
      }
      
      setIsCreateProjectOpen(false);
    } catch (error: any) {
      console.error('Failed to create project', error);
      throw error;
    }
  }, []);

  const handleEditProject = useCallback((project: Project) => {
    setEditingProject(project);
    setIsEditProjectOpen(true);
  }, []);

  const handleUpdateProject = useCallback(async (name: string, description?: string) => {
    if (!editingProject) return;
    try {
      const { project } = await api.updateProject(editingProject.id, { name, description });
      const mappedProject = mapProject(project);
      setProjects((prev) => prev.map(p => p.id === mappedProject.id ? mappedProject : p));
      setIsEditProjectOpen(false);
      setEditingProject(null);
    } catch (error: any) {
      console.error('Failed to update project', error);
      throw error;
    }
  }, [editingProject]);

  const handleDeleteProject = useCallback(() => {
    if (!editingProject) return;
    
    const projectToDelete = editingProject;
    const projectName = projectToDelete.name;
    const agentCount = projectToDelete.agentCount || 0;
    
    showConfirm(
      'Удалить проект?',
      `Проект "${projectName}" и все связанные данные (${agentCount > 0 ? `${agentCount} ${agentCount === 1 ? 'агент' : agentCount < 5 ? 'агента' : 'агентов'}, ` : ''}все сообщения и файлы) будут безвозвратно удалены.\n\nЭто действие нельзя отменить.`,
      async () => {
        try {
          await api.deleteProject(projectToDelete.id);
          
          // Удаляем проект из списка и проверяем, был ли он активным
          setProjects((prev) => {
            const updated = prev.filter(p => p.id !== projectToDelete.id);
            
            // Если удаленный проект был активным, выбираем другой или очищаем
            if (activeProjectId === projectToDelete.id) {
              if (updated.length > 0) {
                // Выбираем первый доступный проект
                const nextProject = updated[0];
                setActiveProjectId(nextProject.id);
                localStorage.setItem('lastUsedProjectId', nextProject.id);
                // Загружаем агентов выбранного проекта
                api.getAgents(nextProject.id)
                  .then(({ agents: apiAgents, projectTypeAgents: apiProjectTypeAgents }) => {
                    const mappedAgents = sortAgents(apiAgents.map(mapAgent));
                    const mappedProjectTypeAgents = apiProjectTypeAgents 
                      ? sortAgents(apiProjectTypeAgents.map(mapProjectTypeAgent))
                      : [];
                    setAgents(mappedAgents);
                    setProjectTypeAgents(mappedProjectTypeAgents);
                    setActiveAgentId(mappedAgents[0]?.id ?? mappedProjectTypeAgents[0]?.id ?? null);
                  })
                  .catch(() => {
                    setAgents([]);
                    setProjectTypeAgents([]);
                    setActiveAgentId(null);
                  });
              } else {
                // Нет других проектов - очищаем все
                setActiveProjectId(null);
                localStorage.removeItem('lastUsedProjectId');
                setAgents([]);
                setProjectTypeAgents([]);
                setActiveAgentId(null);
              }
            }
            
            return updated;
          });
          
          setIsEditProjectOpen(false);
          setEditingProject(null);
          showAlert('Проект успешно удален', undefined, 'success', 3000);
        } catch (error: any) {
          console.error('Failed to delete project', error);
          showAlert(`Не удалось удалить проект: ${error?.message || 'Неизвестная ошибка'}`, 'Ошибка', 'error', 5000);
        }
      },
      'danger'
    );
  }, [editingProject, activeProjectId]);

  const handleUpdateAgent = async (agent: Agent) => {
    try {
      const response = await api.updateAgent(agent.id, {
        name: agent.name,
        description: agent.description,
        systemInstruction: agent.systemInstruction,
        summaryInstruction: agent.summaryInstruction,
        model: agent.model,
        role: agent.role,
      });
      const mapped = mapAgent(response.agent);
      setAgents((prev) => sortAgents(prev.map((item) => (item.id === mapped.id ? mapped : item))));
    } catch (error) {
      console.error('Failed to update agent', error);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    // Запрещаем удаление агентов с ролью
    if (agent && agent.role && agent.role.trim() !== '') {
      showAlert('Нельзя удалить агента с назначенной ролью.', 'Ошибка', 'error', 5000);
      return;
    }
    if (agents.length <= 1) {
      showAlert('Нельзя удалить последнего агента.', 'Ошибка', 'error', 5000);
      return;
    }
    showConfirm(
      'Удалить агента?',
      `Агент "${agent?.name || 'Без имени'}" и вся его история будут удалены.\n\nЭто действие нельзя отменить.`,
      async () => {
        try {
          await api.deleteAgent(agentId);
          setAgents((prev) => prev.filter((agent) => agent.id !== agentId));
          setChatHistories((prev) => {
            const next = { ...prev };
            delete next[agentId];
            return next;
          });
          if (activeAgentId === agentId) {
            const remaining = agents.filter((agent) => agent.id !== agentId);
            setActiveAgentId(remaining[0]?.id ?? null);
          }
          showAlert('Агент успешно удален', undefined, 'success', 3000);
        } catch (error: any) {
          console.error('Failed to delete agent', error);
          showAlert(error?.message || 'Не удалось удалить агента.', 'Ошибка', 'error', 5000);
        }
      },
      'danger'
    );
  };

  const handleFileUpload = async (fileList: FileList) => {
    if (!activeAgent || !fileList.length) return;
    const uploads: UploadedFile[] = [];
    const errors: string[] = [];

    // Разрешенные расширения файлов
    const allowedExtensions = ['.txt', '.md'];
    const allowedMimeTypes = ['text/plain', 'text/markdown'];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      
      // Проверка типа файла
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      const isValidExtension = allowedExtensions.includes(fileExtension);
      const isValidMimeType = !file.type || allowedMimeTypes.includes(file.type);
      
      if (!isValidExtension && !isValidMimeType) {
        errors.push(`Файл ${file.name} не поддерживается. Разрешены только .txt и .md файлы.`);
        continue;
      }
      
      if (file.size > FILE_SIZE_LIMIT) {
        errors.push(`Файл ${file.name} слишком большой (>2MB)`);
        continue;
      }
      
      try {
        const base64 = await readFileToBase64(file);
        // Файлы, загруженные через SettingsPanel, помечаются как база знаний агента
        const { file: uploaded } = await api.uploadFile(activeAgent.id, {
          name: file.name,
          mimeType: file.type || 'text/plain',
          content: base64,
          isKnowledgeBase: true,  // Помечаем как базу знаний
        });
        uploads.push(mapFile(uploaded));
      } catch (error: any) {
        console.error('File upload failed', error);
        errors.push(`Не удалось загрузить ${file.name}: ${error?.message || 'Неизвестная ошибка'}`);
      }
    }

    if (errors.length > 0) {
      showAlert(`Ошибки при загрузке файлов:\n${errors.join('\n')}`, 'Ошибка', 'error', 5000);
    }

    if (uploads.length > 0) {
      setAgents((prev) =>
        prev.map((agent) =>
          agent.id === activeAgent.id ? { ...agent, files: [...uploads, ...agent.files] } : agent,
        ),
      );
      // НЕ добавляем в summaryDocuments - это база знаний агента, не документ проекта
      showAlert(`Успешно загружено файлов в базу знаний: ${uploads.length}`, undefined, 'success', 3000);
    } else if (errors.length === 0) {
      showAlert('Не удалось загрузить файлы', 'Ошибка', 'error', 5000);
    }
  };

  const handleRemoveFile = async (fileId: string) => {
    if (!activeAgent) return;
    
    // Находим файл для отображения имени в подтверждении
    // Проверяем во всех возможных местах, где может быть файл
    const fileToRemove = 
      activeAgent.files.find(f => f.id === fileId) || 
      (summaryDocuments['all'] ?? []).find(f => f.id === fileId);
    
    console.log('[Frontend] handleRemoveFile called:', { fileId, activeAgentId: activeAgent.id, fileToRemove });
    
    if (!fileToRemove) {
      console.error('[Frontend] File not found in state:', { fileId, activeAgentId: activeAgent.id });
      return;
    }
    
    // Показываем окно подтверждения
    showConfirm(
      'Удалить файл?',
      `Файл "${fileToRemove.name}" будет удален.\n\nЭто действие нельзя отменить.`,
      async () => {
        // Используем agentId файла, если он есть, иначе используем activeAgent.id
        const agentIdForDelete = fileToRemove.agentId || activeAgent.id;
        
        console.log('[Frontend] Calling api.deleteProjectFile:', { fileId, agentIdForDelete });
        
        try {
          if (!activeProjectId) {
            throw new Error('Нет активного проекта');
          }
          await api.deleteProjectFile(activeProjectId, fileId);
          console.log('[Frontend] File deleted successfully');
          
          // Удаляем из summaryDocuments (все документы проекта теперь общие)
          setSummaryDocuments((prev) => {
            const updated = { ...prev };
            if (updated['all']) {
              updated['all'] = updated['all'].filter((file) => file.id !== fileId);
            }
            return updated;
          });
          
          // Удаляем из agent.files на фронтенде - из того агента, которому принадлежит файл
          setAgents((prev) =>
            prev.map((agent) => {
              // Если у файла есть agentId, удаляем из соответствующего агента
              // Иначе удаляем из всех агентов (на всякий случай)
              if (fileToRemove.agentId) {
                return agent.id === fileToRemove.agentId
                  ? { ...agent, files: agent.files.filter((file) => file.id !== fileId) }
                  : agent;
              } else {
                // Если agentId нет, удаляем из всех агентов (fallback)
                return { ...agent, files: agent.files.filter((file) => file.id !== fileId) };
              }
            }),
          );
          showAlert('Файл успешно удален', undefined, 'success', 3000);
        } catch (error: any) {
          console.error('[Frontend] Failed to remove file:', error);
          console.error('[Frontend] Error details:', { 
            message: error?.message, 
            status: error?.status,
            agentId: agentIdForDelete,
            fileId 
          });
          showAlert(`Не удалось удалить файл: ${error?.message || 'Неизвестная ошибка'}`, 'Ошибка', 'error', 5000);
        }
      },
      'danger'
    );
  };

  const renderAuthOrLoader = () => {
    if (authToken && isBootstrapping) {
      return (
        <div className="flex items-center justify-center h-full bg-black text-white">
          <div className="text-center space-y-6">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 bg-indigo-500/30 blur-xl rounded-full animate-pulse"></div>
              <div className="relative animate-spin rounded-full h-16 w-16 border-[3px] border-white/20 border-t-indigo-400"></div>
            </div>
            <div className="space-y-2">
              <p className="text-base text-white/80 font-medium">Загружаем рабочее пространство…</p>
            </div>
          </div>
        </div>
      );
    }

    if (!currentUser) {
      return (
        <AuthPage
          onLogin={handleLogin}
          onRegister={handleRegister}
          onResetPassword={handleResetPassword}
          error={authError}
        />
      );
    }

    // Если нет проектов, показываем приглашение создать проект
    if (projects.length === 0 || !activeProjectId) {
      return (
        <>
          <div className="flex items-center justify-center h-full bg-black text-white px-4">
            <div className="text-center space-y-6 max-w-md">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full animate-pulse"></div>
                <Bot size={80} className="relative mx-auto animate-bot" />
              </div>
              <div>
                <p className="text-xl font-bold mb-2">Создайте первый проект</p>
                <p className="text-sm text-white/60">Начните работу, создав ваш первый проект</p>
              </div>
              <button
                className="px-6 py-3 bg-white text-black rounded-full font-bold hover:bg-indigo-50 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsCreateProjectOpen(true);
                }}
                type="button"
              >
                Создать проект
              </button>
            </div>
          </div>
          <CreateProjectDialog
            isOpen={isCreateProjectOpen}
            onClose={() => setIsCreateProjectOpen(false)}
            onCreate={handleCreateProject}
          />
        </>
      );
    }

    // Если есть активный проект, но нет агентов - показываем экран создания агента
    // Но при этом возвращаем null, чтобы основное приложение рендерилось (для показа сайдбара и интерфейса)
    return null;
  };

  const authView = renderAuthOrLoader();
  if (authView) {
    return authView;
  }

  if (isAdminOpen) {
    return <AdminPage onClose={() => setIsAdminOpen(false)} />;
  }

  return (
    <div className="flex h-full bg-gradient-to-br from-black via-black to-indigo-950/20 text-white font-sans overflow-hidden">
      <AgentSidebar 
        projects={projects}
        activeProject={projects.find(p => p.id === activeProjectId) || null}
        agents={agents}
        projectTypeAgents={projectTypeAgents}
        activeAgentId={activeAgent?.id ?? ''}
        onSelectAgent={setActiveAgentId}
        onSelectProject={handleSelectProject}
        onCreateProject={() => setIsCreateProjectOpen(true)}
        onEditProject={handleEditProject}
        onAddAgent={handleAddAgent}
        onDeleteAgent={handleDeleteAgent}
        onReorderAgents={handleReorderAgents}
        isOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
        onOpenDocs={() => setIsDocsOpen(true)}
        onGenerateSummary={handleGenerateSummary}
        isGeneratingSummary={isGeneratingSummary}
        summarySuccess={summarySuccess}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenAdmin={() => setIsAdminOpen(true)}
        documentsCount={projectDocuments.length}
      />

      <main className="flex-1 flex flex-col relative h-full w-full overflow-hidden transition-all duration-300">
        {!activeAgent ? (
          // Если нет агента, показываем экран создания агента внутри рабочей области
          <div className="flex-1 flex items-center justify-center bg-black text-white px-4">
            <div className="text-center space-y-6 max-w-md">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full animate-pulse"></div>
                <Bot size={80} className="relative mx-auto animate-bot" />
              </div>
              <div>
                <p className="text-xl font-bold mb-2">Создайте первого агента</p>
                <p className="text-sm text-white/60">Начните работу, создав вашего первого AI агента</p>
              </div>
              <button
                className="px-6 py-3 bg-white text-black rounded-full font-bold hover:bg-indigo-50 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black"
                onClick={handleAddAgent}
              >
                Создать агента
              </button>
            </div>
          </div>
        ) : (
          <>
            <header className="flex-shrink-0 min-h-[4.5rem] sm:min-h-[4rem] m-2 bg-gradient-to-r from-black/85 via-black/75 to-black/85 backdrop-blur-xl border border-white/20 rounded-[1.5rem] shadow-2xl shadow-black/50 shadow-indigo-500/10 flex items-center justify-between pl-4 sm:pl-6 pr-2 sm:pr-3 z-30 py-2.5 sm:py-2">
               <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                  <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="md:hidden p-2.5 -ml-2 text-white/60 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:ring-offset-2 focus:ring-offset-black rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center transition-all hover:bg-white/5"
                  >
                    <Menu size={20} />
                  </button>
                  
                  <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap">
                        <h2 className="font-bold text-lg sm:text-xl tracking-tight text-white truncate max-w-[200px] sm:max-w-xs md:max-w-sm leading-tight">
                          {activeAgent.name}
                        </h2>
                        
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all duration-300 shadow-sm backdrop-blur-sm flex-shrink-0 ${modelBadgeClass}`}>
                          <ModelBadgeIcon size={12} className={isUltraModel ? 'text-emerald-300' : isGPT5Mini ? 'text-emerald-400' : isMiniModel ? 'text-amber-400' : 'text-pink-400'} />
                          <span className="text-[10px] font-bold uppercase tracking-wider">
                            {modelBadgeLabel}
                          </span>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <button 
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:ring-offset-2 focus:ring-offset-black min-w-[44px] min-h-[44px] flex items-center justify-center hover:shadow-sm hover:bg-white/15"
                    title="Agent Settings (⌘K)"
                  >
                    <Settings size={17} />
                  </button>
                  <button 
                    onClick={handleClearChat}
                    className="p-2.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-red-500/70 focus:ring-offset-2 focus:ring-offset-black min-w-[44px] min-h-[44px] flex items-center justify-center hover:shadow-sm"
                    title="Clear Chat"
                  >
                    <Trash2 size={18} />
                  </button>
               </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin relative bg-gradient-to-b from-transparent via-transparent to-black/20">
               {messages.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40 pointer-events-none px-4">
                     <div className="relative mb-6">
                       <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full animate-pulse"></div>
                       <Bot size={64} className="relative opacity-40" />
                     </div>
                     <p className="text-base font-semibold text-white/60 mb-2">
                       Начните диалог с {activeAgent?.name || 'агентом'}
                     </p>
                     <p className="text-sm text-white/40 text-center max-w-md">
                       Задайте вопрос или попросите помочь с задачей
                     </p>
                  </div>
               )}
               
               {messages
                 .filter((msg) => !(msg.isStreaming && msg.text.length === 0))
                 .map((msg) => (
                   <MessageBubble key={msg.id} message={msg} />
                 ))}
               {isLoading && messages.length > 0 && <MessageSkeleton />}
               <div ref={messagesEndRef} />
            </div>

            <div className="flex-shrink-0 p-4 sm:p-6 bg-gradient-to-t from-black via-black/80 to-transparent z-20">
               <ChatInput onSend={handleSendMessage} disabled={isLoading || !activeAgent} />
            </div>
          </>
        )}
      </main>

      {activeAgent && (
        <SettingsPanel 
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          activeAgent={activeAgent}
          onUpdateAgent={handleUpdateAgent}
          onFileUpload={handleFileUpload}
          onRemoveFile={handleRemoveFile}
          onApplyChanges={() => {}}
          currentUser={currentUser}
        />
      )}

      <ProjectDocumentsModal 
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
        documents={projectDocuments}
        onRemoveFile={handleRemoveFile}
        agents={agents}
        onAgentClick={(agentId) => {
          // Переключаемся на выбранного агента
          setActiveAgentId(agentId);
          setIsDocsOpen(false);
        }}
        onOpenAgentSettings={(agentId) => {
          // Этот обработчик больше не используется напрямую в модальном окне,
          // но оставляем для обратной совместимости
        }}
        onDocumentUpdate={(updatedFile) => {
          // Обновляем документ в списке
          setSummaryDocuments((prev) => {
            const currentDocs = prev['all'] ?? [];
            const updatedDocs = currentDocs.map(doc => 
              doc.id === updatedFile.id ? updatedFile : doc
            );
            return {
              ...prev,
              'all': updatedDocs,
            };
          });
        }}
        onUpdateAgent={handleUpdateAgent}
        onFileUpload={handleFileUpload}
        onAgentFilesUpdate={(agentId: string, files: UploadedFile[]) => {
          // Обновляем файлы агента в списке
          setAgents((prev) =>
            prev.map((agent) =>
              agent.id === agentId ? { ...agent, files } : agent
            )
          );
        }}
        onRemoveAgentFile={async (fileId: string) => {
          // Для удаления файлов из базы знаний агента
          const fileToRemove = agents
            .flatMap(agent => agent.files)
            .find(f => f.id === fileId);
          
          if (!fileToRemove) return;
          
          showConfirm(
            'Удалить файл из базы знаний?',
            `Файл "${fileToRemove.name}" будет удален из базы знаний.\n\nЭто действие нельзя отменить.`,
            async () => {
              try {
                if (!activeProjectId) {
                  throw new Error('Нет активного проекта');
                }
                await api.deleteProjectFile(activeProjectId, fileId);
                // Обновляем агентов, удаляя файл из того агента, которому он принадлежит
                setAgents((prev) =>
                  prev.map((agent) => {
                    if (fileToRemove.agentId && agent.id === fileToRemove.agentId) {
                      return { ...agent, files: agent.files.filter((file) => file.id !== fileId) };
                    }
                    return agent;
                  })
                );
                showAlert('Файл успешно удален из базы знаний', undefined, 'success', 3000);
              } catch (error: any) {
                console.error('Failed to remove agent file:', error);
                showAlert(`Не удалось удалить файл: ${error?.message || 'Неизвестная ошибка'}`, 'Ошибка', 'error', 5000);
              }
            },
            'danger'
          );
        }}
        onShowConfirm={showConfirm}
        onShowAlert={showAlert}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
      />

      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={() => setAlertDialog(prev => ({ ...prev, isOpen: false }))}
        title={alertDialog.title}
        message={alertDialog.message}
        variant={alertDialog.variant}
        duration={alertDialog.variant === 'success' ? 3000 : alertDialog.variant === 'error' ? 5000 : 4000}
      />

      <CreateProjectDialog
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        onCreate={handleCreateProject}
        projectTypes={projectTypes}
      />

      <EditProjectDialog
        isOpen={isEditProjectOpen}
        onClose={() => {
          setIsEditProjectOpen(false);
          setEditingProject(null);
        }}
        onUpdate={handleUpdateProject}
        onDelete={handleDeleteProject}
        project={editingProject}
      />

    </div>
  );
}