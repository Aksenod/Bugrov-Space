import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Settings, Trash2, Menu, AlertCircle, Zap, Cpu, Brain, Briefcase, FileText, MessageSquare } from 'lucide-react';

import { Message, Role, LLMModel, MODELS, UploadedFile, Agent, User, Project, ProjectType } from './types';
import { MessageBubble } from './components/MessageBubble';
import { MessageSkeleton } from './components/MessageSkeleton';
import { ChatInput } from './components/ChatInput';
import { AgentSidebar } from './components/AgentSidebar';
import { ProjectDocumentsModal } from './components/ProjectDocumentsModal';
import { AuthPage } from './components/AuthPage';
import { AdminPage } from './components/AdminPage';
import { CreateProjectDialog } from './components/CreateProjectDialog';
import { EditProjectDialog } from './components/EditProjectDialog';
import { ConfirmDialog } from './components/ConfirmDialog';
import { AlertDialog } from './components/AlertDialog';
import { OnboardingModal } from './components/OnboardingModal';
import { InlineHint } from './components/InlineHint';
import { useOnboarding } from './components/OnboardingContext';
import { onboardingSteps } from './components/onboardingSteps';
import { api, ApiAgent, ApiFile, ApiMessage, ApiUser, ApiProject, ApiProjectTypeAgent } from './services/api';

const FILE_SIZE_LIMIT = 2 * 1024 * 1024;
const COLOR_PRESETS = ['indigo', 'emerald', 'amber', 'purple', 'rose', 'cyan', 'blue'];
const ADMIN_USERNAMES = new Set(['admin', 'aksenod']);

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
  isKnowledgeBase: file.isKnowledgeBase,
  dslContent: file.dslContent,
  verstkaContent: file.verstkaContent,
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
  projectTypeAgentId: agent.projectTypeAgentId,
  isHiddenFromSidebar: agent.isHiddenFromSidebar,
});

const sortAgents = (agentList: Agent[]) =>
  [...agentList].sort((a, b) => {
    const orderA = a.order ?? 0;
    const orderB = b.order ?? 0;
    if (orderA === orderB) {
      // Используем id для стабильной сортировки при одинаковом order
      return a.id.localeCompare(b.id);
    }
    return orderA - orderB;
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
  order: agent.order ?? 0, // Убеждаемся, что order всегда число
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

interface AgentHint {
  title: string;
  description: string;
  examples: string[];
}

const QUESTION_PREFIXES = [
  'как',
  'что',
  'зачем',
  'почему',
  'когда',
  'какие',
  'какой',
  'какая',
  'каких',
  'сколько',
  'можно ли',
  'how',
  'what',
  'why',
  'when',
  'which',
  'can',
  'should',
];

const sanitizeLine = (text: string) =>
  text
    .replace(/^[-*•\d\)\(]+\s*/, '')
    .replace(/\s+/g, ' ')
    .replace(/\s([,.!?;:])/g, '$1')
    .trim();

const ensureEnding = (text: string, ending: string) => {
  if (!text) return text;
  return text.endsWith(ending) ? text : `${text}${ending}`;
};

const toSentenceCase = (text: string) => {
  if (!text) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
};

const isQuestion = (text: string) => {
  const lower = text.toLowerCase();
  return QUESTION_PREFIXES.some(prefix => lower.startsWith(prefix));
};

const dedupe = (items: string[]) => {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = item.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const extractAgentPhrases = (agent?: Agent, max = 4): string[] => {
  if (!agent) return [];
  const raw = [agent.systemInstruction, agent.summaryInstruction, agent.description]
    .filter(Boolean)
    .join('\n')
    .trim();

  if (!raw) {
    return [];
  }

  const lines = raw
    .split(/\r?\n/)
    .map(line => sanitizeLine(line))
    .filter(line => line.length >= 12 && /[a-zA-Zа-яА-Я]/.test(line));

  const sentences = raw
    .split(/[.!?]+/)
    .map(sentence => sanitizeLine(sentence))
    .filter(sentence => sentence.length >= 25 && /[a-zA-Zа-яА-Я]/.test(sentence));

  const merged = dedupe([...lines, ...sentences]);
  return merged.slice(0, max);
};

const formatExampleForAgent = (phrase: string, agentName: string) => {
  const cleaned = sanitizeLine(phrase);
  if (!cleaned) return '';

  if (isQuestion(cleaned)) {
    return `Спроси ${agentName}: ${ensureEnding(cleaned, '?')}`;
  }

  const imperative = cleaned.replace(/^(?:можешь|может|нужно|должен|обязан|ты|вы)\s+/i, '').trim();
  const tail = imperative || cleaned;
  return `Попроси ${agentName} ${ensureEnding(toSentenceCase(tail), '')}`.trim();
};

const getDefaultAgentExamples = (agentName: string): string[] => [
  `Спроси ${agentName}, какие шаги он предложит для вашей задачи`,
  `Попроси ${agentName} уточнить требования на основе документов проекта`,
  `Попроси ${agentName} улучшить результат прошлой итерации`,
  `Уточни у ${agentName}, какие данные ему нужны, чтобы начать работу`,
];

const buildAgentHint = (agent?: Agent): AgentHint | null => {
  if (!agent) return null;
  const descriptionSource = agent.description?.trim() || agent.systemInstruction?.trim() || '';
  const description = descriptionSource
    ? descriptionSource.slice(0, 260).trim() + (descriptionSource.length > 260 ? '…' : '')
    : `Используйте ${agent.name}, чтобы получить экспертизу по его специализации.`;

  const phrases = extractAgentPhrases(agent);
  const examples = phrases
    .map(phrase => formatExampleForAgent(phrase, agent.name))
    .filter(Boolean);

  return {
    title: `${agent.name}: идеи запросов`,
    description,
    examples: examples.length ? examples.slice(0, 4) : getDefaultAgentExamples(agent.name),
  };
};

export default function App() {
  const onboarding = useOnboarding();
  const [authToken, setAuthToken] = useState(() => api.getToken());
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [chatHistories, setChatHistories] = useState<Record<string, Message[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summarySuccess, setSummarySuccess] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [adminInitialAgentId, setAdminInitialAgentId] = useState<string | undefined>(undefined);
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
    onConfirm: () => { },
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
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadedAgentsRef = useRef(new Set<string>());
  const loadedSummaryRef = useRef(new Set<string>());
  const bootstrapInProgressRef = useRef(false);
  const lastBootstrapTokenRef = useRef<string | null>(null);
  const hasBootstrappedRef = useRef(false);

  const { shouldShowStep, completeStep, isStepCompleted } = useOnboarding();

  const activeAgent = useMemo(() => {
    if (!agents.length) {
      return undefined;
    }
    if (!activeAgentId) {
      return agents[0];
    }
    return agents.find((agent) => agent.id === activeAgentId) ?? agents[0];
  }, [activeAgentId, agents]);

  // Получаем реальный ID агента для загрузки сообщений
  const realAgentIdForMessages = useMemo(() => {
    return activeAgent?.id ?? null;
  }, [activeAgent?.id]);

  const messages = realAgentIdForMessages ? chatHistories[realAgentIdForMessages] ?? [] : [];
  // Документы проекта общие для всех агентов - всегда используем ключ 'all'
  const projectDocuments = summaryDocuments['all'] ?? [];

  // Логирование для диагностики (только в dev режиме)
  useEffect(() => {
    if (import.meta.env.DEV && activeAgent) {
      console.log(`[Frontend] Active agent changed: ${activeAgent.name} (${activeAgent.id})`);
      console.log(`[Frontend] activeAgentId: ${activeAgentId}`);
      console.log(`[Frontend] realAgentIdForMessages: ${realAgentIdForMessages}`);
      console.log(`[Frontend] Project documents count: ${projectDocuments.length}`);
    }
  }, [activeAgent?.id, activeAgentId, realAgentIdForMessages, projectDocuments.length]);
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
    setActiveAgentId(null);
    setChatHistories({});
    loadedAgentsRef.current.clear();
    loadedSummaryRef.current.clear();
    setSummaryDocuments({});
    lastBootstrapTokenRef.current = null;
    bootstrapInProgressRef.current = false;
    hasBootstrappedRef.current = false;
  }, [isNewUser, projects.length]);

  const bootstrap = useCallback(async () => {
    const token = api.getToken();
    if (!token) {
      setCurrentUser(null);
      setProjects([]);
      setActiveProjectId(null);
      setAgents([]);
      setActiveAgentId(null);
      lastBootstrapTokenRef.current = null;
      hasBootstrappedRef.current = false;
      return;
    }

    // Предотвращаем параллельные вызовы bootstrap
    if (bootstrapInProgressRef.current) {
      if (import.meta.env.DEV) {
        console.log('[Bootstrap] Already in progress, skipping...');
      }
      return;
    }

    // Если bootstrap уже был выполнен с тем же токеном, пропускаем
    if (lastBootstrapTokenRef.current === token && hasBootstrappedRef.current) {
      if (import.meta.env.DEV) {
        console.log('[Bootstrap] Already bootstrapped with this token, skipping...');
      }
      return;
    }

    bootstrapInProgressRef.current = true;
    lastBootstrapTokenRef.current = token;
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
          const { agents: apiAgents } = await api.getAgents(projectToSelect);
          const mappedAgents = sortAgents(apiAgents.map(mapAgent));
          setAgents(mappedAgents);

          setActiveAgentId((prev) => {
            if (prev && mappedAgents.some((agent) => agent.id === prev)) {
              return prev;
            }
            const fallbackId = mappedAgents[0]?.id ?? null;
            if (import.meta.env.DEV) {
              console.log(`[Bootstrap] Selecting agent as activeAgentId: ${fallbackId}`);
            }
            return fallbackId;
          });
        } catch (error) {
          console.error('Failed to load agents in bootstrap', error);
          setAgents([]);
          setActiveAgentId(null);
        }
      } else {
        setAgents([]);
        setActiveAgentId(null);
      }

      loadedAgentsRef.current.clear();
      loadedSummaryRef.current.clear();
      setChatHistories({});
      setSummaryDocuments({});
      hasBootstrappedRef.current = true;
    } catch (error: any) {
      console.error('Bootstrap failed', error);

      // Проверяем тип ошибки
      const isAuthError = error?.status === 401 || error?.status === 403;
      const isDbError = error?.status === 503 || error?.status === 500 ||
        error?.message?.includes('Database') ||
        error?.message?.includes('Can\'t reach database');
      const isRateLimitError = error?.status === 429;

      // Если ошибка авторизации - выкидываем пользователя
      if (isAuthError) {
        api.clearToken();
        setAuthToken(null);
        setCurrentUser(null);
        setProjects([]);
        setActiveProjectId(null);
        setAgents([]);
        setActiveAgentId(null);
        setChatHistories({});
        loadedAgentsRef.current.clear();
        loadedSummaryRef.current.clear();
        setSummaryDocuments({});
        lastBootstrapTokenRef.current = null;
        hasBootstrappedRef.current = false;
      } else if (isDbError || isRateLimitError) {
        // Если ошибка базы данных или rate limit - оставляем пользователя залогиненным, но с пустыми данными
        // Пользователь может попробовать обновить страницу позже
        if (isRateLimitError) {
          const errorMessage = error?.message || 'Превышен лимит запросов. Пожалуйста, подождите минуту и обновите страницу.';
          showAlert(errorMessage, 'Превышен лимит запросов', 'warning', 10000);
        } else {
          if (import.meta.env.DEV) {
            console.warn('Database temporarily unavailable, keeping user logged in');
          }
        }
        // Не очищаем данные, если они уже были загружены - пользователь может продолжать работать
        // Очищаем только если это первая загрузка
        if (!currentUser && projects.length === 0) {
          setProjects([]);
          setActiveProjectId(null);
          setAgents([]);
          setActiveAgentId(null);
          setChatHistories({});
          loadedAgentsRef.current.clear();
          loadedSummaryRef.current.clear();
          setSummaryDocuments({});
        }
      } else {
        // Для других ошибок - также оставляем пользователя залогиненным
        // Не очищаем данные, если они уже были загружены
        if (!currentUser && projects.length === 0) {
          setProjects([]);
          setActiveProjectId(null);
          setAgents([]);
          setActiveAgentId(null);
          setChatHistories({});
          loadedAgentsRef.current.clear();
          loadedSummaryRef.current.clear();
          setSummaryDocuments({});
        }
      }
    } finally {
      setIsBootstrapping(false);
      bootstrapInProgressRef.current = false;
    }
  }, [currentUser, projects.length]);

  // Проверка, является ли пользователь администратором
  const isAdmin =
    !!currentUser &&
    (currentUser.role === 'admin' || (currentUser.username && ADMIN_USERNAMES.has(currentUser.username)));

  // Функция для перезагрузки агентов текущего проекта
  const reloadAgents = useCallback(async () => {
    if (!activeProjectId) return;

    try {
      const { agents: apiAgents } = await api.getAgents(activeProjectId);
      const mappedAgents = sortAgents(apiAgents.map(mapAgent));
      setAgents(mappedAgents);

      // Обновляем активного агента, если он все еще существует
      setActiveAgentId((prev) => {
        if (prev && mappedAgents.some((agent) => agent.id === prev)) {
          return prev;
        }
        return mappedAgents[0]?.id ?? null;
      });
    } catch (error) {
      console.error('Failed to reload agents', error);
    }
  }, [activeProjectId]);

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
      // Escape - закрыть модальные окна
      if (e.key === 'Escape') {
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
  }, [currentUser, activeAgent, isDocsOpen, isSidebarOpen]);

  // Проверяем, находимся ли мы на странице админ-панели
  // ВАЖНО: Этот хук должен быть вызван ДО условного возврата, чтобы соблюдать правила хуков
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#/admin') {
        setIsAdminOpen(true);
      } else if (window.location.hash === '' && isAdminOpen) {
        setIsAdminOpen(false);
        setAdminInitialAgentId(undefined);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    // Проверяем при монтировании
    if (window.location.hash === '#/admin') {
      setIsAdminOpen(true);
    }

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [isAdminOpen]);

  const ensureMessagesLoaded = useCallback(
    async (agentId: string) => {
      if (!agentId || loadedAgentsRef.current.has(agentId)) {
        return;
      }
      loadedAgentsRef.current.add(agentId);
      try {
        const { messages: apiMessages } = await api.getMessages(agentId, activeProjectId || undefined);
        setChatHistories((prev) => ({
          ...prev,
          [agentId]: apiMessages.map(mapMessage),
        }));
      } catch (error) {
        console.error('Failed to load messages', error);
      }
    },
    [activeProjectId],
  );

  // Оптимизация: загружаем сообщения только после завершения bootstrap
  // и только для активного агента (не для всех сразу)
  useEffect(() => {
    if (realAgentIdForMessages && !isBootstrapping) {
      if (import.meta.env.DEV) {
        console.log(`[useEffect messages] Loading messages for realAgentId: ${realAgentIdForMessages}, activeAgentId: ${activeAgentId}`);
      }
      // Небольшая задержка, чтобы интерфейс успел отрендериться
      const timer = setTimeout(() => {
        ensureMessagesLoaded(realAgentIdForMessages);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [realAgentIdForMessages, isBootstrapping, ensureMessagesLoaded, activeAgentId]);

  const ensureSummaryLoaded = useCallback(
    async (agentId: string) => {
      if (!agentId || !activeProjectId) return;

      // Документы проекта общие для всех агентов - загружаем с ключом 'all'
      const PROJECT_DOCS_KEY = 'all';

      // УБИРАЕМ проверку кеша - всегда загружаем документы при переключении агента
      // чтобы гарантировать, что видны ВСЕ документы всех агентов
      // Проверка кеша блокировала перезагрузку при переключении агента

      // Помечаем как загружаемый (но не проверяем, был ли уже загружен)
      loadedSummaryRef.current.add(PROJECT_DOCS_KEY);

      try {
        // Используем agentId для запроса, но бэкенд вернет все файлы пользователя
        if (import.meta.env.DEV) {
          console.log(`[Frontend] Loading project documents for agent: ${agentId}, project: ${activeProjectId}`);
        }
        const { files } = await api.getSummaryFiles(agentId, activeProjectId);
        if (import.meta.env.DEV) {
          console.log(`[Frontend] ✅ Loaded project documents (ALL files from all agents):`, files.length, 'files');
          console.log(`[Frontend] File details:`, files.map(f => ({
            id: f.id,
            name: f.name,
            agentId: f.agentId,
            hasDSL: !!f.dslContent,
            hasVerstka: !!f.verstkaContent,
            dslLen: f.dslContent?.length,
            verstkaLen: f.verstkaContent?.length,
          })));
        }
        // Сохраняем под ключом 'all' для всех агентов - это ВСЕ документы всех агентов
        setSummaryDocuments((prev) => {
          const mapped = files.map(mapFile);
          if (import.meta.env.DEV) {
            console.log(`[Frontend] Setting summaryDocuments['all'] with ${mapped.length} files`);
          }
          return {
            ...prev,
            [PROJECT_DOCS_KEY]: mapped,
          };
        });
      } catch (error: any) {
        // Если 404 - просто нет файлов, это нормально, устанавливаем пустой массив
        // Проверяем статус напрямую или по сообщению
        if (error?.status === 404 || error?.message?.includes('404') || error?.message?.includes('Not Found')) {
          if (import.meta.env.DEV) {
            console.log(`[Frontend] No project documents found (404 is normal if no files exist)`);
          }
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
    [activeProjectId],
  );

  // Оптимизация: загружаем документы проекта только после завершения bootstrap
  // и только для активного агента (не для всех сразу)
  useEffect(() => {
    // Не загружаем во время bootstrap
    if (isBootstrapping || !realAgentIdForMessages) {
      return;
    }

    // Документы проекта общие для всех агентов - загружаем при переключении агента
    // Но с небольшой задержкой, чтобы интерфейс успел отрендериться
    const timer = setTimeout(() => {
      // Сбрасываем кеш, чтобы гарантировать загрузку всех документов всех агентов
      loadedSummaryRef.current.delete('all');
      if (import.meta.env.DEV) {
        console.log(`[Frontend] useEffect: Переключение на агента ${realAgentIdForMessages}, сброс кеша и загрузка документов`);
      }
      ensureSummaryLoaded(realAgentIdForMessages);
    }, 200); // Небольшая задержка для лучшего UX

    return () => clearTimeout(timer);
  }, [isBootstrapping, realAgentIdForMessages, ensureSummaryLoaded]);

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
      setActiveAgentId(null);
      loadedAgentsRef.current.clear();
      loadedSummaryRef.current.clear();
      setChatHistories({});
      setSummaryDocuments({});

      // Помечаем как нового пользователя и показываем приветствие
      setIsNewUser(true);
      setShowWelcomeModal(true);

      // Пытаемся загрузить данные (но не критично, если не получится)
      try {
        await bootstrap();
      } catch (bootstrapError: any) {
        // Если bootstrap не удался из-за временной проблемы с БД - не критично
        // Пользователь уже залогинен и может попробовать обновить страницу
        if (import.meta.env.DEV) {
          console.warn('Bootstrap after registration failed, but user is logged in', bootstrapError);
        }
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

  const handleSendMessage = async (text: string) => {
    if (!activeAgent || !text.trim() || isLoading) return;

    if (!activeProjectId) {
      showAlert('Ошибка: не выбран активный проект', undefined, 'error', 3000);
      return;
    }

    setIsLoading(true);
    setSummarySuccess(false);

    const agentId = activeAgent.id;
    const trimmedText = text.trim();

    const tempUserMessageId = `temp-user-${Date.now()}`;
    const tempUserMessage: Message = {
      id: tempUserMessageId,
      role: Role.USER,
      text: trimmedText,
      timestamp: new Date(),
    };

    const loadingMessageId = `loading-${Date.now()}`;
    const loadingMessage: Message = {
      id: loadingMessageId,
      role: Role.MODEL,
      text: '',
      timestamp: new Date(),
      isStreaming: true,
    };

    setChatHistories((prev) => ({
      ...prev,
      [agentId]: [
        ...(prev[agentId] ?? []),
        tempUserMessage,
        loadingMessage,
      ],
    }));

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    try {
      const response = await api.sendMessage(agentId, trimmedText, activeProjectId);
      const newMessages = response.messages.map(mapMessage);

      setChatHistories((prev) => ({
        ...prev,
        [agentId]: [
          ...(prev[agentId] ?? []).filter(
            (msg) => msg.id !== tempUserMessageId && msg.id !== loadingMessageId
          ),
          ...newMessages,
        ],
      }));

      loadedAgentsRef.current.add(agentId);
    } catch (error: any) {
      console.error('Chat error', error);

      const errorMessage = error?.message || 'Ошибка генерации. Попробуйте позже.';

      setChatHistories((prev) => {
        const currentMessages = (prev[agentId] ?? []).filter(
          (msg) => msg.id !== loadingMessageId
        );
        const hasUserMessage = currentMessages.some(
          (msg) => msg.role === Role.USER && msg.text === tempUserMessage.text
        );

        return {
          ...prev,
          [agentId]: [
            ...currentMessages,
            ...(hasUserMessage ? [] : [tempUserMessage]),
            {
              id: `error-${Date.now()}-${Math.random()}`,
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
    if (!activeAgent || !realAgentIdForMessages) return;
    showConfirm(
      'Очистить историю чата?',
      'Все сообщения в этом чате будут удалены.\nЭто действие нельзя отменить.',
      async () => {
        try {
          await api.clearMessages(realAgentIdForMessages, activeProjectId || undefined);
          setChatHistories((prev) => ({ ...prev, [realAgentIdForMessages]: [] }));
          loadedAgentsRef.current.delete(realAgentIdForMessages);
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
    if (!activeAgent || !activeAgentId || !realAgentIdForMessages || messages.length < 1 || !activeProjectId) return;
    setIsGeneratingSummary(true);
    try {
      if (import.meta.env.DEV) {
        console.log('[Frontend] handleGenerateSummary called:', {
          agentId: activeAgentId, // Используем ID шаблона для генерации
          realAgentId: realAgentIdForMessages,
          agentName: activeAgent.name,
          messagesCount: messages.length,
          projectId: activeProjectId,
        });
      }

      // Используем activeAgentId (ID шаблона), так как бэкенд ожидает ID шаблона
      // и сам создаст/найдет реальный агент через getOrCreateAgentFromTemplate
      const { file } = await api.generateSummary(activeAgentId, activeProjectId);

      if (import.meta.env.DEV) {
        console.log('[Frontend] Summary generated successfully:', {
          fileId: file.id,
          fileName: file.name,
          agentId: file.agentId,
        });
      }

      const uploaded = mapFile(file);
      // Добавляем созданный файл напрямую в summaryDocuments (документы проекта общие для всех агентов)
      setSummaryDocuments((prev) => {
        const updated = {
          ...prev,
          'all': [uploaded, ...(prev['all'] ?? [])],
        };
        if (import.meta.env.DEV) {
          console.log('[Frontend] Updated summaryDocuments:', {
            totalFiles: updated['all'].length,
            newFile: uploaded.name,
          });
        }
        return updated;
      });
      // Очищаем кеш загрузки, чтобы при следующем переключении файлы перезагрузились
      loadedSummaryRef.current.delete('all');
      setSummarySuccess(true);
      setTimeout(() => setSummarySuccess(false), 3000);
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('[Frontend] Summary generation failed:', error);
        console.error('[Frontend] Error details:', {
          message: error?.message,
          status: error?.status,
          stack: error?.stack,
        });
      }
      showAlert(`Не удалось создать саммари: ${error?.message || 'Неизвестная ошибка'}`, 'Ошибка', 'error', 5000);
    } finally {
      setIsGeneratingSummary(false);
    }
  };


  const handleSelectProject = useCallback(async (projectId: string) => {
    setActiveProjectId(projectId);
    localStorage.setItem('lastUsedProjectId', projectId);
    try {
      const { agents: apiAgents } = await api.getAgents(projectId);
      const mappedAgents = sortAgents(apiAgents.map(mapAgent));
      setAgents(mappedAgents);
      setActiveAgentId(mappedAgents[0]?.id ?? null);

      loadedAgentsRef.current.clear();
      loadedSummaryRef.current.clear();
      setChatHistories({});
      setSummaryDocuments({});
    } catch (error) {
      console.error('Failed to load agents for project', error);
      showAlert('Ошибка при загрузке агентов проекта', 'error');
    }
  }, []);

  const [showProjectCreatedModal, setShowProjectCreatedModal] = useState(false);

  const handleCreateProject = useCallback(async (name: string, projectTypeId: string, description?: string) => {
    const isFirstProject = projects.length === 0;
    const shouldShowProjectModal = isNewUser && isFirstProject;

    try {
      const { project } = await api.createProject({ name, projectTypeId, description });
      const mappedProject = mapProject(project);
      setProjects((prev) => [...prev, mappedProject]);
      setActiveProjectId(mappedProject.id);
      localStorage.setItem('lastUsedProjectId', mappedProject.id);

      // Загружаем агентов проекта
      try {
        const { agents: apiAgents } = await api.getAgents(mappedProject.id);
        const mappedAgents = sortAgents(apiAgents.map(mapAgent));
        setAgents(mappedAgents);
        setActiveAgentId(mappedAgents[0]?.id ?? null);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.log('No agents in new project, this is expected');
        }
        setAgents([]);
        setActiveAgentId(null);
      }

      setIsCreateProjectOpen(false);

      if (shouldShowProjectModal) {
        setShowProjectCreatedModal(true);
        setIsNewUser(false);
      }
    } catch (error: any) {
      console.error('Failed to create project', error);
      throw error;
    }
  }, [isNewUser, projects.length]);

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
                  .then(({ agents: apiAgents }) => {
                    const mappedAgents = sortAgents(apiAgents.map(mapAgent));
                    setAgents(mappedAgents);
                    setActiveAgentId(mappedAgents[0]?.id ?? null);
                  })
                  .catch(() => {
                    setAgents([]);
                    setActiveAgentId(null);
                  });
              } else {
                // Нет других проектов - очищаем все
                setActiveProjectId(null);
                localStorage.removeItem('lastUsedProjectId');
                setAgents([]);
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

  // Пользователь не может изменять агентов, поэтому функции обновления/удаления/загрузки базы знаний удалены

  const handleRemoveFile = async (fileId: string) => {
    const projectFiles = summaryDocuments['all'] ?? [];
    const fileToRemove = projectFiles.find(doc => doc.id === fileId);

    if (!fileToRemove) {
      if (import.meta.env.DEV) {
        console.error('[Frontend] File not found in summary documents:', { fileId });
      }
      return;
    }

    if (fileToRemove.isKnowledgeBase) {
      showAlert('Управление базой знаний выполняет администратор.', 'Ошибка', 'error', 4000);
      return;
    }

    showConfirm(
      'Удалить файл?',
      `Файл "${fileToRemove.name}" будет удален.\n\nЭто действие нельзя отменить.`,
      async () => {
        if (import.meta.env.DEV) {
          console.log('[Frontend] Calling api.deleteProjectFile:', { fileId });
        }

        try {
          if (activeProjectId) {
            try {
              await api.deleteProjectFile(activeProjectId, fileId);
            } catch (projectDeleteError: any) {
              const shouldFallback = projectDeleteError?.status === 403 || projectDeleteError?.status === 404;
              if (!shouldFallback) {
                throw projectDeleteError;
              }
              if (import.meta.env.DEV) {
                console.warn('[Frontend] Project-scoped deletion failed, falling back to direct delete', {
                  fileId,
                  projectId: activeProjectId,
                  status: projectDeleteError?.status,
                  message: projectDeleteError?.message,
                });
              }
              await api.deleteFileById(fileId);
            }
          } else {
            await api.deleteFileById(fileId);
          }

          if (realAgentIdForMessages && activeProjectId) {
            loadedSummaryRef.current.delete('all');
            try {
              const { files } = await api.getSummaryFiles(realAgentIdForMessages, activeProjectId);
              const mapped = files.map(mapFile);
              setSummaryDocuments((prev) => ({
                ...prev,
                'all': mapped,
              }));
            } catch (reloadError: any) {
              if (reloadError?.status === 404 || reloadError?.message?.includes('404') || reloadError?.message?.includes('Not Found')) {
                setSummaryDocuments((prev) => ({
                  ...prev,
                  'all': [],
                }));
              } else {
                console.error('[Frontend] Failed to reload documents after deletion:', reloadError);
                setSummaryDocuments((prev) => {
                  const updated = { ...prev };
                  if (updated['all']) {
                    updated['all'] = updated['all'].filter((file) => file.id !== fileId);
                  }
                  return updated;
                });
              }
            }
          } else {
            setSummaryDocuments((prev) => {
              const updated = { ...prev };
              if (updated['all']) {
                updated['all'] = updated['all'].filter((file) => file.id !== fileId);
              }
              return updated;
            });
          }

          showAlert('Файл успешно удален', undefined, 'success', 3000);
        } catch (error: any) {
          console.error('[Frontend] Failed to remove file:', error);
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

    // Если нет проектов, показываем приглашение создать проект (кроме админов)
    if (!isAdmin && (projects.length === 0 || !activeProjectId)) {
      return (
        <>
          <div className="relative flex items-center justify-center h-full bg-black text-white px-4">
            <button
              type="button"
              onClick={handleLogout}
              className="absolute top-4 right-4 px-4 py-2 rounded-full border border-white/20 text-sm font-semibold text-white/70 hover:text-white hover:border-white/40 hover:bg-white/5 transition-all focus:outline-none focus:ring-2 focus:ring-white/40 focus:ring-offset-2 focus:ring-offset-black"
            >
              Выйти
            </button>
            <div className="text-center space-y-6 max-w-2xl">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full animate-pulse"></div>
                <Bot size={80} className="relative mx-auto animate-bot" />
              </div>
              <div>
                <p className="text-xl font-bold mb-2">Создайте первый проект</p>
                <p className="text-sm text-white/60 mb-4">Начните работу, создав ваш первый проект</p>
              </div>

              {/* Информационный блок о проектах */}
              {shouldShowStep({
                id: 'empty-projects-hint',
                component: 'inline',
                content: {
                  title: 'Что такое проект?',
                  description: 'Проект — это рабочее пространство для организации вашей работы с AI-агентами. В каждом проекте есть набор агентов, которые помогут вам с различными задачами. Выберите тип проекта, и система автоматически создаст подходящих агентов.',
                },
                showOnce: true,
              }) && (
                  <div className="max-w-lg mx-auto">
                    <InlineHint
                      title="Что такое проект?"
                      description="Проект — это рабочее пространство для организации вашей работы с AI-агентами. В каждом проекте есть набор агентов, которые помогут вам с различными задачами. Выберите тип проекта, и система автоматически создаст подходящих агентов."
                      variant="info"
                      collapsible={true}
                      defaultExpanded={true}
                      dismissible={true}
                      onDismiss={() => completeStep('empty-projects-hint')}
                    />
                  </div>
                )}

              <button
                id="create-project-button"
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

  if (isAdminOpen || window.location.hash === '#/admin') {
    return <AdminPage
      onClose={() => {
        setIsAdminOpen(false);
        setAdminInitialAgentId(undefined);
        window.location.hash = '';
        window.history.replaceState(null, '', window.location.pathname);
        // Перезагружаем агентов после закрытия AdminPage, чтобы обновить порядок
        reloadAgents();
      }}
      initialAgentId={adminInitialAgentId}
      onAgentUpdated={reloadAgents}
    />;
  }

  return (
    <div className="flex h-full bg-gradient-to-br from-black via-black to-indigo-950/20 text-white font-sans overflow-hidden">
      <AgentSidebar
        projects={projects}
        activeProject={projects.find(p => p.id === activeProjectId) || null}
        agents={agents}
        activeAgentId={activeAgent?.id ?? ''}
        onSelectAgent={setActiveAgentId}
        onSelectProject={handleSelectProject}
        onCreateProject={() => setIsCreateProjectOpen(true)}
        onEditProject={handleEditProject}
        isOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
        onOpenDocs={() => setIsDocsOpen(true)}
        onGenerateSummary={handleGenerateSummary}
        isGeneratingSummary={isGeneratingSummary}
        summarySuccess={summarySuccess}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenAdmin={() => {
          setAdminInitialAgentId(undefined);
          setIsAdminOpen(true);
        }}
        documentsCount={projectDocuments.length}
      />

      <main className="flex-1 flex flex-col relative h-full w-full overflow-hidden transition-all duration-300">
        {!activeAgent ? (
          // Если нет агента, показываем пустой экран
          <div className="flex-1 flex items-center justify-center bg-black text-white px-4">
            <div className="text-center space-y-6 max-w-2xl">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full animate-pulse"></div>
                <Bot size={80} className="relative mx-auto animate-bot" />
              </div>
              <div>
                <p className="text-xl font-bold mb-2">Нет доступных агентов</p>
                <p className="text-sm text-white/60 mb-4">Агенты будут доступны после настройки проекта</p>
              </div>

              {/* Информационный блок об агентах */}
              {shouldShowStep({
                id: 'empty-agents-hint',
                component: 'inline',
                content: {
                  title: 'Откуда берутся агенты?',
                  description: 'Агенты автоматически создаются при создании проекта на основе выбранного типа проекта. Каждый тип проекта имеет свой набор специализированных агентов. Если агентов нет, возможно, выбранный тип проекта еще не настроен администратором.',
                },
                showOnce: true,
              }) && (
                  <div className="max-w-lg mx-auto">
                    <InlineHint
                      title="Откуда берутся агенты?"
                      description="Агенты автоматически создаются при создании проекта на основе выбранного типа проекта. Каждый тип проекта имеет свой набор специализированных агентов. Если агентов нет, возможно, выбранный тип проекта еще не настроен администратором."
                      variant="info"
                      collapsible={true}
                      defaultExpanded={true}
                      dismissible={true}
                      onDismiss={() => completeStep('empty-agents-hint')}
                    />
                  </div>
                )}
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

                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all duration-300 shadow-sm flex-shrink-0 ${modelBadgeClass}`}>
                      <ModelBadgeIcon size={12} className={isUltraModel ? 'text-emerald-300' : isGPT5Mini ? 'text-emerald-400' : isMiniModel ? 'text-amber-400' : 'text-pink-400'} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        {modelBadgeLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                {isAdmin && (
                  <button
                    onClick={() => {
                      window.location.hash = '#/admin';
                      setAdminInitialAgentId(activeAgentId || undefined);
                      setIsAdminOpen(true);
                    }}
                    className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:ring-offset-2 focus:ring-offset-black min-w-[44px] min-h-[44px] flex items-center justify-center hover:shadow-sm hover:bg-white/15"
                    title="Настройки агентов"
                  >
                    <Settings size={17} />
                  </button>
                )}
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
                  <p className="text-sm text-white/40 text-center max-w-md mb-4">
                    Задайте вопрос или попросите помочь с задачей
                  </p>

                  {/* Примеры вопросов */}
                  {shouldShowStep({
                    id: 'empty-chat-hint',
                    component: 'inline',
                    content: {
                      title: 'Примеры вопросов',
                      description: 'Вы можете задавать любые вопросы агенту. Агент использует документы проекта для контекста, поэтому загрузите файлы, чтобы получить более точные ответы.',
                    },
                    showOnce: true,
                  }) && (
                      <div className="max-w-md mx-auto pointer-events-auto">
                        <InlineHint
                          title="Примеры вопросов"
                          description="Вы можете задавать любые вопросы агенту. Агент использует документы проекта для контекста, поэтому загрузите файлы, чтобы получить более точные ответы."
                          examples={[
                            'Объясни концепцию из документа',
                            'Помоги с задачей на основе контекста проекта',
                            'Создай план работы',
                            'Проанализируй данные',
                          ]}
                          variant="info"
                          collapsible={true}
                          defaultExpanded={false}
                          dismissible={true}
                          onDismiss={() => completeStep('empty-chat-hint')}
                        />
                      </div>
                    )}
                </div>
              )}

              {(() => {
                // Убираем дубликаты по ID перед рендером
                const uniqueMessages = new Map<string, Message>();
                messages
                  .filter((msg) => !(msg.isStreaming && msg.text.length === 0))
                  .forEach((msg) => {
                    // Если сообщение с таким ID уже есть, оставляем последнее (более свежее)
                    if (!uniqueMessages.has(msg.id) || msg.timestamp > uniqueMessages.get(msg.id)!.timestamp) {
                      uniqueMessages.set(msg.id, msg);
                    }
                  });
                return Array.from(uniqueMessages.values()).map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ));
              })()}
              {isLoading && messages.length > 0 && <MessageSkeleton />}
              <div ref={messagesEndRef} />
            </div>

            <div className="flex-shrink-0 p-4 sm:p-6 bg-gradient-to-t from-black via-black/80 to-transparent z-20">
              <ChatInput onSend={handleSendMessage} disabled={isLoading || !activeAgent} />
            </div>
          </>
        )}
      </main>

      <ProjectDocumentsModal
        isOpen={isDocsOpen}
        onClose={() => setIsDocsOpen(false)}
        documents={projectDocuments}
        onRemoveFile={handleRemoveFile}
        agents={agents}
        project={projects.find(p => p.id === activeProjectId) || null}
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
        onShowConfirm={showConfirm}
        onShowAlert={showAlert}
        currentUser={currentUser}
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
        duration={3000}
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

      {/* Welcome Modal for new users */}
      {showWelcomeModal && isNewUser && (
        <OnboardingModal
          steps={onboardingSteps}
          isVisible={showWelcomeModal}
          onComplete={(stepId) => {
            completeStep(stepId);
            if (stepId === onboardingSteps[onboardingSteps.length - 1].id) {
              setShowWelcomeModal(false);
              setIsNewUser(false);
            }
          }}
          onDismiss={() => {
            onboardingSteps.forEach(step => completeStep(step.id));
            setShowWelcomeModal(false);
            setIsNewUser(false);
          }}
          startStep={0}
        />
      )}

      {/* Project Created Modal */}
      {showProjectCreatedModal && (
        <OnboardingModal
          steps={[{
            id: 'project-created',
            component: 'modal',
            content: {
              title: 'Проект создан! 🎉',
              description: 'Отлично! Ваш проект создан, и агенты уже готовы к работе.\n\n**Что дальше?**\n\n• Агенты находятся в боковой панели слева\n• Выберите агента, чтобы начать диалог\n• Загрузите документы через кнопку "Documents"\n• Агенты используют документы проекта для контекста',
              examples: [
                'Выберите агента из списка слева',
                'Начните диалог, задав вопрос',
                'Загрузите документы для лучшего контекста',
              ],
            },
            showOnce: true,
          }]}
          isVisible={showProjectCreatedModal}
          onComplete={(stepId) => {
            completeStep(stepId);
            setShowProjectCreatedModal(false);
          }}
          onDismiss={() => {
            completeStep('project-created');
            setShowProjectCreatedModal(false);
          }}
          startStep={0}
        />
      )}

    </div>
  );
}