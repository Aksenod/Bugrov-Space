import React, { useCallback, useEffect, useState, Suspense, useRef } from 'react';
import { Bot, AlertCircle } from 'lucide-react';

import { UploadedFile, Agent, User, Project } from './types';
import { AgentSidebar } from './components/AgentSidebar';
import { CreateProjectDialog } from './components/CreateProjectDialog';
import { EditProjectDialog } from './components/EditProjectDialog';
import { ConfirmDialog } from './components/ConfirmDialog';
import { AlertDialog } from './components/AlertDialog';
import { OnboardingModal } from './components/OnboardingModal';
import { WorkspacePage } from './components/WorkspacePage';
import { EmptyStatePage } from './components/EmptyStatePage';
import { InlineHint } from './components/InlineHint';
import { useOnboarding } from './components/OnboardingContext';
import { onboardingSteps } from './components/onboardingSteps';
import { LoadingFallback, ModalLoadingFallback } from './components/LoadingFallback';
// Старый api.ts оставлен для обратной совместимости с некоторыми методами
// Постепенно будет заменен на отдельные сервисы
import { api } from './services/api';
import { useDialogs, useRouting } from './hooks';
import { 
  useAuthContext, 
  useProjectContext, 
  useAgentContext, 
  useChatContext, 
  useDocumentsContext,
  useBootstrapContext 
} from './contexts';
import { ADMIN_USERNAMES } from './utils';

// Lazy loading для страниц (загружаются по требованию)
const AuthPage = React.lazy(() => import('./components/AuthPage').then(m => ({ default: m.AuthPage })));
const AdminPage = React.lazy(() => import('./components/AdminPage').then(m => ({ default: m.AdminPage })));
const OfferPage = React.lazy(() => import('./components/OfferPage').then(m => ({ default: m.OfferPage })));
const PrivacyPage = React.lazy(() => import('./components/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const RequisitesPage = React.lazy(() => import('./components/RequisitesPage').then(m => ({ default: m.RequisitesPage })));
const LandingPage = React.lazy(() => import('./components/landing/LandingPage').then(m => ({ default: m.LandingPage })));
const CreativeLandingPage = React.lazy(() => import('./components/landing/CreativeLandingPage').then(m => ({ default: m.CreativeLandingPage })));
const UltraCreativeLandingPage = React.lazy(() => import('./components/landing/UltraCreativeLandingPage').then(m => ({ default: m.UltraCreativeLandingPage })));
const PublicPrototypePage = React.lazy(() => import('./components/PublicPrototypePage').then(m => ({ default: m.PublicPrototypePage })));

// Lazy loading для модальных окон (загружаются по требованию)
const ProjectDocumentsModal = React.lazy(() => import('./components/ProjectDocumentsModal').then(m => ({ default: m.ProjectDocumentsModal })));
const FileUploadModal = React.lazy(() => import('./components/FileUploadModal').then(m => ({ default: m.FileUploadModal })));
const PaymentModal = React.lazy(() => import('./components/PaymentModal')); // default export

// LoadingFallback теперь импортируется из components/LoadingFallback.tsx

// Все утилиты и константы теперь импортируются из ./utils

export default function App() {
  const onboarding = useOnboarding();
  
  // Используем контексты
  const {
    token: authToken,
    user: currentUser,
    authError,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    resetPassword: handleResetPassword,
    clearError: clearAuthError,
  } = useAuthContext();
  
  const {
    showConfirm,
    confirmDialog,
    closeConfirm,
    showAlert,
    alertDialog,
    closeAlert,
  } = useDialogs();

  const {
    projects,
    activeProjectId,
    projectTypes,
    isLoading: projectsLoading,
    createProject: createProjectApi,
    updateProject: updateProjectApi,
    deleteProject: deleteProjectApi,
    selectProject,
    getProject,
    setProjects,
  } = useProjectContext();

  const {
    agents,
    activeAgentId,
    isLoading: agentsLoading,
    activeAgent,
    reloadAgents,
    selectAgent,
    getAgent,
    loadAgents,
    setAgents,
    setActiveAgentId,
  } = useAgentContext();

  const chat = useChatContext();
  const documents = useDocumentsContext();
  const bootstrap = useBootstrapContext();

  // Используем хук для роутинга
  const routing = useRouting(currentUser);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isFileUploadOpen, setIsFileUploadOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  const { shouldShowStep, completeStep, isStepCompleted } = useOnboarding();

  // Используем сообщения из хука чата
  const messages = chat.messages;
  // Используем документы из хука документов
  const projectDocuments = documents.documents;

  // Логирование для диагностики (только в dev режиме)
  useEffect(() => {
    if (import.meta.env.DEV && activeAgent) {
      console.log(`[Frontend] Active agent changed: ${activeAgent.name} (${activeAgent.id})`);
      console.log(`[Frontend] activeAgentId: ${activeAgentId}`);
      console.log(`[Frontend] Project documents count: ${projectDocuments.length}`);
    }
  }, [activeAgent?.id, activeAgentId, projectDocuments.length]);


  // Обертка для handleLogout с дополнительной очисткой
  const handleLogoutWithCleanup = useCallback(() => {
    handleLogout();
    setAgents([]);
    setActiveAgentId(null);
    chat.clearAllChatHistories();
    chat.clearLoadedAgents();
    bootstrap.reset();
  }, [handleLogout, setAgents, setActiveAgentId, chat, bootstrap]);

  // Вызываем bootstrap при изменении токена
  // Используем ref для отслеживания, был ли bootstrap вызван вручную (через handleLoginWithBootstrap)
  const bootstrapCalledManuallyRef = useRef(false);
  // Используем ref для хранения стабильных ссылок на функции
  const bootstrapRef = useRef(bootstrap);
  const handleLogoutWithCleanupRef = useRef(handleLogoutWithCleanup);
  
  // Обновляем refs при изменении функций
  useEffect(() => {
    bootstrapRef.current = bootstrap;
    handleLogoutWithCleanupRef.current = handleLogoutWithCleanup;
  }, [bootstrap, handleLogoutWithCleanup]);
  
  useEffect(() => {
    if (!authToken) {
      handleLogoutWithCleanupRef.current();
      bootstrapCalledManuallyRef.current = false;
      return;
    }
    
    // Если bootstrap был вызван вручную, не вызываем его снова
    if (bootstrapCalledManuallyRef.current) {
      bootstrapCalledManuallyRef.current = false;
      return;
    }
    
    // Вызываем bootstrap для случая, когда пользователь уже залогинен (например, при перезагрузке страницы)
    bootstrapRef.current.bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]); // Только authToken в зависимостях, чтобы избежать бесконечного цикла

  // Проверка, является ли пользователь администратором
  const isAdmin =
    !!currentUser &&
    (currentUser.role === 'admin' || (currentUser.username && ADMIN_USERNAMES.has(currentUser.username)));

  // Загружаем документы при открытии модального окна
  useEffect(() => {
    if (isDocsOpen && activeAgentId && activeProjectId && !bootstrap.isBootstrapping) {
      documents.ensureSummaryLoaded().catch((error) => {
        console.error('[Frontend] Failed to load documents when opening modal:', error);
        showAlert('Не удалось загрузить документы', 'Ошибка', 'error', 5000);
      });
    }
  }, [isDocsOpen, activeAgentId, activeProjectId, bootstrap.isBootstrapping, documents, showAlert]);

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

  // Роутинг теперь управляется через хук useRouting

  // Загружаем сообщения при переключении агента (логика теперь в useChat)
  useEffect(() => {
    if (activeAgentId && !bootstrap.isBootstrapping) {
      const timer = setTimeout(() => {
        chat.ensureMessagesLoaded(activeAgentId);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeAgentId, bootstrap.isBootstrapping, chat]);

  // Функции обработки ошибок теперь импортируются из ./utils/errorHandling
  // showConfirm и showAlert теперь предоставляются через useDialogs
  // handleLogin, handleRegister, handleResetPassword теперь предоставляются через useAuth

  // Обертка для handleLogin с вызовом bootstrap
  const handleLoginWithBootstrap = useCallback(async (username: string, password: string) => {
    bootstrapCalledManuallyRef.current = true; // Помечаем, что bootstrap будет вызван вручную
    await handleLogin(username, password);
    // Небольшая задержка, чтобы убедиться, что токен успел синхронизироваться
    await new Promise(resolve => setTimeout(resolve, 50));
    await bootstrap.bootstrap();
  }, [handleLogin, bootstrap]);

  // Обертка для handleRegister с дополнительной логикой
  const handleRegisterWithBootstrap = useCallback(async (username: string, password: string) => {
    await handleRegister(username, password);

    // После регистрации у пользователя нет проектов - он должен создать первый
    setProjects([]);
    selectProject(null);
    setAgents([]);
    setActiveAgentId(null);
    chat.clearAllChatHistories();
    chat.clearLoadedAgents();

    // Помечаем как нового пользователя и показываем приветствие
    setIsNewUser(true);
    setShowWelcomeModal(true);

    // Пытаемся загрузить данные (но не критично, если не получится)
    try {
      await bootstrap.bootstrap();
    } catch (bootstrapError: any) {
      // Если bootstrap не удался из-за временной проблемы с БД - не критично
      // Пользователь уже залогинен и может попробовать обновить страницу
      if (import.meta.env.DEV) {
        console.warn('Bootstrap after registration failed, but user is logged in', bootstrapError);
      }
    }
  }, [handleRegister, setProjects, selectProject, setAgents, setActiveAgentId, chat, bootstrap]);

  const handleSendMessage = useCallback(async (text: string) => {
    if (import.meta.env.DEV) {
      console.log('[App] handleSendMessage called:', {
        text: text?.substring(0, 50),
        hasActiveAgent: !!activeAgent,
        activeAgentId,
        activeProjectId,
        isLoading: chat.isLoading,
        chatType: typeof chat,
        chatSendMessageType: typeof chat?.sendMessage,
      });
    }

    if (!activeAgent) {
      if (import.meta.env.DEV) {
        console.warn('[App] Cannot send message: no active agent');
      }
      showAlert('Ошибка: не выбран активный агент', undefined, 'error', 3000);
      return;
    }

    if (!text || !text.trim()) {
      if (import.meta.env.DEV) {
        console.warn('[App] Cannot send message: empty text');
      }
      return;
    }

    if (chat.isLoading) {
      if (import.meta.env.DEV) {
        console.warn('[App] Cannot send message: chat is loading');
      }
      return;
    }

    if (!activeProjectId) {
      if (import.meta.env.DEV) {
        console.warn('[App] Cannot send message: no active project');
      }
      showAlert('Ошибка: не выбран активный проект', undefined, 'error', 3000);
      return;
    }

    try {
      if (import.meta.env.DEV) {
        console.log('[App] Calling chat.sendMessage');
      }
      
      // Проверка, что chat.sendMessage существует
      if (!chat || typeof chat.sendMessage !== 'function') {
        console.error('[App] chat.sendMessage is not a function:', {
          chat: chat,
          chatSendMessage: chat?.sendMessage,
          chatSendMessageType: typeof chat?.sendMessage
        });
        showAlert('Ошибка: функция отправки сообщений не доступна', 'Ошибка', 'error', 5000);
        return;
      }
      
      await chat.sendMessage(text);
      if (import.meta.env.DEV) {
        console.log('[App] Message sent successfully');
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Ошибка генерации. Попробуйте позже.';
      console.error('[App] Failed to send message:', error);
      showAlert(errorMessage, 'Ошибка', 'error', 5000);
    }
  }, [activeAgent, activeAgentId, activeProjectId, chat, showAlert]);

  // Логирование для диагностики handleSendMessage
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[App] handleSendMessage check:', {
        type: typeof handleSendMessage,
        isFunction: typeof handleSendMessage === 'function',
        value: handleSendMessage
      });
    }
  }, [handleSendMessage]);

  const handleClearChat = useCallback(async () => {
    if (!activeAgent || !activeAgentId) return;
    showConfirm(
      'Очистить историю чата?',
      'Все сообщения в этом чате будут удалены.\nЭто действие нельзя отменить.',
      async () => {
        try {
          await chat.clearChat();
          showAlert('История чата успешно очищена', undefined, 'success', 3000);
        } catch (error: any) {
          console.error('Failed to clear chat', error);
          showAlert(`Не удалось очистить чат: ${error?.message || 'Неизвестная ошибка'}`, 'Ошибка', 'error', 5000);
        }
      },
      'warning'
    );
  }, [activeAgent, activeAgentId, chat, showConfirm, showAlert]);

  const handleGenerateSummary = useCallback(async () => {
    if (!activeAgent || !activeAgentId || messages.length < 1 || !activeProjectId) return;
    try {
      await documents.generateSummary();
    } catch (error: any) {
      showAlert(`Не удалось создать саммари: ${error?.message || 'Неизвестная ошибка'}`, 'Ошибка', 'error', 5000);
    }
  }, [activeAgent, activeAgentId, messages.length, activeProjectId, documents, showAlert]);


  const handleSelectProject = useCallback(async (projectId: string) => {
    selectProject(projectId);
    try {
      await loadAgents(projectId);
      chat.clearAllChatHistories();
      chat.clearLoadedAgents();
    } catch (error) {
      console.error('Failed to load agents for project', error);
      showAlert('Ошибка при загрузке агентов проекта', 'Ошибка', 'error', 5000);
    }
  }, [selectProject, loadAgents, showAlert, chat]);

  const [showProjectCreatedModal, setShowProjectCreatedModal] = useState(false);

  const handleCreateProject = useCallback(async (name: string, projectTypeId: string, description?: string) => {
    const isFirstProject = projects.length === 0;
    const shouldShowProjectModal = isNewUser && isFirstProject;

    try {
      const mappedProject = await createProjectApi(name, projectTypeId, description);

      // Загружаем агентов проекта
      try {
        await loadAgents(mappedProject.id);
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
  }, [isNewUser, projects.length, createProjectApi, loadAgents]);

  const handleEditProject = useCallback((project: Project) => {
    setEditingProject(project);
    setIsEditProjectOpen(true);
  }, []);

  const handleUpdateProject = useCallback(async (name: string, description?: string) => {
    if (!editingProject) return;
    try {
      await updateProjectApi(editingProject.id, name, description);
      setIsEditProjectOpen(false);
      setEditingProject(null);
    } catch (error: any) {
      console.error('Failed to update project', error);
      throw error;
    }
  }, [editingProject, updateProjectApi]);

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
          await deleteProjectApi(projectToDelete.id);

          // Если удаленный проект был активным и есть другие проекты, загружаем их агентов
          if (activeProjectId && projects.length > 1) {
            const nextProject = projects.find(p => p.id !== projectToDelete.id);
            if (nextProject) {
              try {
                await loadAgents(nextProject.id);
              } catch {
                setAgents([]);
                setActiveAgentId(null);
              }
            }
          } else {
            setAgents([]);
            setActiveAgentId(null);
          }

          setIsEditProjectOpen(false);
          setEditingProject(null);
          
          // Показываем тост с небольшой задержкой, чтобы убедиться, что все обновления состояния завершены
          setTimeout(() => {
            showAlert('Проект успешно удален', undefined, 'success', 3000);
          }, 100);
        } catch (error: any) {
          console.error('Failed to delete project', error);
          showAlert(`Не удалось удалить проект: ${error?.message || 'Неизвестная ошибка'}`, 'Ошибка', 'error', 5000);
        }
      },
      'danger'
    );
  }, [editingProject, activeProjectId, deleteProjectApi, projects, loadAgents, showAlert]);

  // Пользователь не может изменять агентов, поэтому функции обновления/удаления/загрузки базы знаний удалены

  const handleRemoveFile = useCallback(async (fileId: string) => {
    const fileToRemove = projectDocuments.find(doc => doc.id === fileId);

    if (!fileToRemove) {
      if (import.meta.env.DEV) {
        console.error('[Frontend] File not found in documents:', { fileId });
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
        try {
          await documents.removeFile(fileId);
          showAlert('Файл успешно удален', undefined, 'success', 3000);
        } catch (error: any) {
          console.error('[Frontend] Failed to remove file:', error);
          showAlert(`Не удалось удалить файл: ${error?.message || 'Неизвестная ошибка'}`, 'Ошибка', 'error', 5000);
        }
      },
      'danger'
    );
  }, [projectDocuments, documents, showConfirm, showAlert]);

  const handleFileUpload = useCallback(async (files: FileList) => {
    if (files.length === 0) {
      setIsFileUploadOpen(false);
      return;
    }

    try {
      await documents.uploadFiles(files);
      showAlert(
        files.length === 1 ? 'Файл успешно загружен' : `${files.length} файлов успешно загружено`,
        'Успех',
        'success',
        3000
      );
      setIsFileUploadOpen(false);
    } catch (error: any) {
      console.error('[Frontend] Failed to upload files:', error);
      showAlert(`Не удалось загрузить файлы: ${error?.message || 'Неизвестная ошибка'}`, 'Ошибка', 'error', 5000);
    }
  }, [documents, showAlert]);

  const renderAuthOrLoader = () => {
    if (authToken && bootstrap.isBootstrapping) {
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
        <Suspense fallback={<LoadingFallback />}>
          <AuthPage
            onLogin={handleLoginWithBootstrap}
            onRegister={handleRegisterWithBootstrap}
            onResetPassword={handleResetPassword}
            error={authError}
            onClearError={clearAuthError}
          />
        </Suspense>
      );
    }

    // Проверка подписки для НЕ-админов (сразу после аутентификации)
    if (!isAdmin && currentUser.isPaid === false) {
      return (
        <div className="flex items-center justify-center h-full bg-black text-white p-4">
          <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center space-y-6">
            <div className="w-16 h-16 mx-auto bg-red-500/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Требуется подписка</h2>
              <p className="text-gray-400">
                Для доступа к платформе необходимо оплатить подписку.
              </p>
            </div>

            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all"
            >
              Оплатить подписку — 1000 ₽
            </button>

            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-white transition-colors"
            >
              Выйти из аккаунта
            </button>

            <PaymentModal
              isOpen={isPaymentModalOpen}
              onClose={() => setIsPaymentModalOpen(false)}
              token={authToken || ''}
            />
          </div>
        </div>
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
                  description: 'Проект — это рабочее пространство для организации вашей работы с AI-агентами. В каждом проекте есть набор агентов, которые помогут вам с различными задачами. Выберите тип проекта, и система автоматически подберет подходящих агентов.',
                },
                showOnce: true,
              }) && (
                  <div className="max-w-lg mx-auto">
                    <InlineHint
                      title="Что такое проект?"
                      description="Проект — это рабочее пространство для организации вашей работы с AI-агентами. В каждом проекте есть набор агентов, которые помогут вам с различными задачами. Выберите тип проекта, и система автоматически подберет подходящих агентов."
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

  // Landing page check - should be first
  // Проверяем hash первым, чтобы избежать показа landing при #/projects
  const currentHash = window.location.hash;
  // Не показываем landing если hash указывает на другую страницу
  const isSpecialPage = currentHash === '#/projects' || currentHash === '#/admin' || currentHash === '#/promo' || currentHash === '#/ultra' || currentHash === '#/auth' || currentHash === '#/offer' || currentHash === '#/privacy' || currentHash === '#/requisites' || currentHash.startsWith('#/prototype/');
  if (!isSpecialPage && (routing.routeState.isLandingOpen || currentHash === '#/landing' || currentHash === '#/' || currentHash === '')) {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <LandingPage
          isAuthenticated={!!currentUser}
          username={currentUser?.username}
          onOpenPayment={() => setIsPaymentModalOpen(true)}
          onOpenCabinet={() => {
            window.location.hash = '#/projects';
          }}
          onLogout={handleLogoutWithCleanup}
        />
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          token={authToken || ''}
        />
      </Suspense>
    );
  }

  // Creative landing page check
  if (routing.routeState.isCreativeLandingOpen || currentHash === '#/promo') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <CreativeLandingPage
          isAuthenticated={!!currentUser}
          username={currentUser?.username}
          onOpenPayment={() => setIsPaymentModalOpen(true)}
          onOpenCabinet={() => {
            window.location.hash = '#/projects';
          }}
          onLogout={handleLogoutWithCleanup}
        />
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          token={authToken || ''}
        />
      </Suspense>
    );
  }

  // Ultra creative landing page check
  if (routing.routeState.isUltraLandingOpen || currentHash === '#/ultra') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <UltraCreativeLandingPage
          isAuthenticated={!!currentUser}
          username={currentUser?.username}
          onOpenPayment={() => setIsPaymentModalOpen(true)}
          onOpenCabinet={() => {
            window.location.hash = '#/projects';
          }}
          onLogout={handleLogoutWithCleanup}
        />
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          token={authToken || ''}
        />
      </Suspense>
    );
  }

  // Auth check moved down to allow public access to legal pages

  if (routing.routeState.isAdminOpen || window.location.hash === '#/admin') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <AdminPage
          onClose={() => {
            routing.setRouteState({ isAdminOpen: false, adminInitialAgentId: undefined });
            // Устанавливаем hash в #/projects, чтобы вернуться на страницу проектов
            if (window.location.hash === '#/admin') {
              routing.navigateTo('#/projects');
            }
            // Перезагружаем агентов после закрытия AdminPage, чтобы обновить порядок
            reloadAgents();
          }}
          initialAgentId={routing.routeState.adminInitialAgentId}
          onAgentUpdated={reloadAgents}
        />
      </Suspense>
    );
  }

  if (routing.routeState.isOfferOpen || window.location.hash === '#/offer') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <OfferPage
          onClose={() => {
            routing.setRouteState({ isOfferOpen: false });
            routing.navigateTo('');
          }}
        />
      </Suspense>
    );
  }

  if (routing.routeState.isPrivacyOpen || window.location.hash === '#/privacy') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <PrivacyPage
          onClose={() => {
            routing.setRouteState({ isPrivacyOpen: false });
            routing.navigateTo('');
          }}
        />
      </Suspense>
    );
  }

  if (routing.routeState.isRequisitesOpen || window.location.hash === '#/requisites') {
    return (
      <Suspense fallback={<LoadingFallback />}>
        <RequisitesPage
          onClose={() => {
            routing.setRouteState({ isRequisitesOpen: false });
            routing.navigateTo('');
          }}
        />
      </Suspense>
    );
  }

  if (routing.routeState.prototypeHash || window.location.hash.startsWith('#/prototype/')) {
    const hash = routing.routeState.prototypeHash || window.location.hash.replace('#/prototype/', '').split('?')[0];
    // Extract version from query parameter
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const versionParam = urlParams.get('v');
    const versionNumber = versionParam ? parseInt(versionParam, 10) : undefined;
    
    return (
      <Suspense fallback={<LoadingFallback />}>
        <PublicPrototypePage
          prototypeHash={hash}
          versionNumber={versionNumber}
          onClose={() => {
            routing.setRouteState({ prototypeHash: null });
            routing.navigateTo('');
          }}
        />
      </Suspense>
    );
  }

  // Render Auth or Loader
  const authOrLoader = renderAuthOrLoader();
  if (authOrLoader) return authOrLoader;

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
        isGeneratingSummary={documents.isGeneratingSummary}
        summarySuccess={documents.summarySuccess}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenAdmin={() => {
          routing.setRouteState({ adminInitialAgentId: undefined, isAdminOpen: true });
        }}
        documentsCount={projectDocuments.length}
      />

      <main className="flex-1 flex flex-col relative h-full w-full overflow-hidden transition-all duration-300">
        {!activeAgent ? (
          <EmptyStatePage type="no-agents" />
        ) : (
          <WorkspacePage
            activeAgent={activeAgent}
            messages={messages}
            isLoading={chat.isLoading}
            isSidebarOpen={isSidebarOpen}
            isAdmin={isAdmin}
            activeAgentId={activeAgentId}
            onSidebarToggle={() => setIsSidebarOpen(true)}
            onSendMessage={handleSendMessage || (async () => {
              console.error('[App] handleSendMessage is undefined when passing to WorkspacePage');
            })}
            onClearChat={handleClearChat}
            onOpenAdmin={() => {
              routing.navigateTo('#/admin');
              routing.setRouteState({ adminInitialAgentId: activeAgentId || undefined, isAdminOpen: true });
            }}
            onSelectAgent={setActiveAgentId}
          />
        )}
      </main>

      {isDocsOpen && (
        <Suspense fallback={
          <div className="fixed inset-0 z-50 bg-gradient-to-br from-black via-black to-indigo-950/20 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full animate-pulse"></div>
                <Bot size={64} className="relative mx-auto animate-bounce" />
              </div>
              <p className="text-white/60">Загрузка документов...</p>
            </div>
          </div>
        }>
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
              // Документы теперь управляются через хук useDocuments
              // Обновление происходит автоматически при перезагрузке
            }}
            onShowConfirm={showConfirm}
            onShowAlert={showAlert}
            currentUser={currentUser}
            onFileUpload={() => setIsFileUploadOpen(true)}
          />
        </Suspense>
      )}

      {isFileUploadOpen && (
        <Suspense fallback={<ModalLoadingFallback />}>
          <FileUploadModal
            isOpen={isFileUploadOpen}
            onClose={() => setIsFileUploadOpen(false)}
            onUpload={handleFileUpload}
            isUploading={documents.isLoading}
          />
        </Suspense>
      )}

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={closeConfirm}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
      />

      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={closeAlert}
        title={alertDialog.title}
        message={alertDialog.message}
        variant={alertDialog.variant}
        duration={alertDialog.duration ?? 3000}
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