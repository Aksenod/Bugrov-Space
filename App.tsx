import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Settings, Trash2, Menu, AlertCircle, Zap, Cpu, Brain } from 'lucide-react';

import { Message, Role, LLMModel, MODELS, UploadedFile, Agent, User } from './types';
import { MessageBubble } from './components/MessageBubble';
import { ChatInput } from './components/ChatInput';
import { SettingsPanel } from './components/SettingsPanel';
import { AgentSidebar } from './components/AgentSidebar';
import { ProjectDocumentsModal } from './components/ProjectDocumentsModal';
import { AuthPage } from './components/AuthPage';
import { api, ApiAgent, ApiFile, ApiMessage, ApiUser } from './services/api';

const PROJECT_NAME = 'Bugrov Space';
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
});

const mapMessage = (message: ApiMessage): Message => ({
  id: message.id,
  role: message.role === 'USER' ? Role.USER : Role.MODEL,
  text: message.text,
  timestamp: new Date(message.createdAt),
});

const mapUser = (user: ApiUser): User => ({
  id: user.id,
  name: user.name,
  email: user.email,
});

export default function App() {
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [summaryDocuments, setSummaryDocuments] = useState<Record<string, UploadedFile[]>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const loadedAgentsRef = useRef(new Set<string>());
  const loadedSummaryRef = useRef(new Set<string>());

  const activeAgent = useMemo(() => {
    if (!activeAgentId) {
      return agents[0];
    }
    return agents.find((agent) => agent.id === activeAgentId) ?? agents[0];
  }, [activeAgentId, agents]);

  const messages = activeAgent ? chatHistories[activeAgent.id] ?? [] : [];
  const projectDocuments = activeAgent ? (summaryDocuments[activeAgent.id] ?? []) : [];
  const resolvedModel = (activeAgent?.model as LLMModel) || LLMModel.GPT51;
  const isMiniModel = resolvedModel === LLMModel.GPT4O_MINI;
  const isUltraModel = resolvedModel === LLMModel.GPT51;
  const modelBadgeClass = isUltraModel
    ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-200/80'
    : isMiniModel
      ? 'bg-amber-500/5 border-amber-500/20 text-amber-300/80'
      : 'bg-pink-500/5 border-pink-500/20 text-pink-300/80';
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
  }, []);

  const bootstrap = useCallback(async () => {
    if (!api.getToken()) {
      setCurrentUser(null);
      setAgents([]);
      setActiveAgentId(null);
      return;
    }

    setIsBootstrapping(true);
    try {
      const [{ user }, { agents: apiAgents }] = await Promise.all([api.getCurrentUser(), api.getAgents()]);
      setCurrentUser(mapUser(user));
      const mappedAgents = apiAgents.map(mapAgent);
      setAgents(mappedAgents);
      setActiveAgentId((prev) => {
        if (prev && mappedAgents.some((agent) => agent.id === prev)) {
          return prev;
        }
        return mappedAgents[0]?.id ?? null;
      });
      loadedAgentsRef.current.clear();
      loadedSummaryRef.current.clear();
      setChatHistories({});
      setSummaryDocuments({});
    } catch (error) {
      console.error('Bootstrap failed', error);
      handleLogout();
    } finally {
      setIsBootstrapping(false);
    }
  }, [handleLogout]);

  useEffect(() => {
    if (authToken) {
      bootstrap();
    } else {
      handleLogout();
    }
  }, [authToken, bootstrap, handleLogout]);

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

  useEffect(() => {
    if (activeAgent) {
      ensureMessagesLoaded(activeAgent.id);
    }
  }, [activeAgent, ensureMessagesLoaded]);

  const ensureSummaryLoaded = useCallback(
    async (agentId: string) => {
      if (!agentId) return;
      
      // Если уже загружали или загружаем для этого агента - пропускаем
      if (loadedSummaryRef.current.has(agentId)) {
        return;
      }
      
      // Помечаем как загружаемый
      loadedSummaryRef.current.add(agentId);
      
      try {
        const { files } = await api.getSummaryFiles(agentId);
        console.log(`[Frontend] Loaded summary files for agent ${agentId}:`, files.length, 'files');
        console.log(`[Frontend] File names:`, files.map(f => f.name));
        setSummaryDocuments((prev) => ({
          ...prev,
          [agentId]: files.map(mapFile),
        }));
      } catch (error: any) {
        // Если 404 - просто нет файлов, это нормально, устанавливаем пустой массив
        // Проверяем статус напрямую или по сообщению
        if (error?.status === 404 || error?.message?.includes('404') || error?.message?.includes('Not Found')) {
          console.log(`[Frontend] No summary files found for agent ${agentId} (404 is normal if no files exist)`);
          setSummaryDocuments((prev) => ({
            ...prev,
            [agentId]: [],
          }));
          // Оставляем в кеше, чтобы не повторять запрос
          return;
        }
        // Для других ошибок убираем из кеша, чтобы можно было повторить
        loadedSummaryRef.current.delete(agentId);
        console.error('[Frontend] Failed to load summary files:', error);
      }
    },
    [],
  );

  // Загружаем документы после завершения bootstrap и при смене активного агента
  useEffect(() => {
    // Не загружаем во время bootstrap
    if (isBootstrapping || !activeAgent?.id) {
      return;
    }

    // Проверяем, не загружали ли уже для этого агента
    if (loadedSummaryRef.current.has(activeAgent.id)) {
      return;
    }

    ensureSummaryLoaded(activeAgent.id);
  }, [isBootstrapping, activeAgent?.id, ensureSummaryLoaded]);

  const handleLogin = async (email: string, password: string) => {
    setAuthError(null);
    const payload = {
      email: email.trim().toLowerCase(),
      password: password.trim(),
    };
    try {
      const response = await api.login(payload);
      api.setToken(response.token);
      setAuthToken(response.token);
      setCurrentUser(mapUser(response.user));
      await bootstrap();
    } catch (error: any) {
      setAuthError(error.message || 'Не удалось войти');
      throw error;
    }
  };

  const handleRegister = async (name: string, email: string, password: string) => {
    setAuthError(null);
    try {
      const response = await api.register({
        name: name.trim() || 'User',
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });
      api.setToken(response.token);
      setAuthToken(response.token);
      setCurrentUser(mapUser(response.user));
      const mappedAgents = response.agents.map(mapAgent);
      setAgents(mappedAgents);
      setActiveAgentId(mappedAgents[0]?.id ?? null);
      loadedAgentsRef.current.clear();
      loadedSummaryRef.current.clear();
      setChatHistories({});
      setSummaryDocuments({});
    } catch (error: any) {
      setAuthError(error.message || 'Не удалось создать аккаунт');
      throw error;
    }
  };

  const handleResetPassword = async (email: string, newPassword: string) => {
    setAuthError(null);
    try {
      await api.resetPassword({
        email: email.trim().toLowerCase(),
        newPassword: newPassword.trim(),
      });
    } catch (error: any) {
      setAuthError(error.message || 'Не удалось обновить пароль');
      throw error;
    }
  };

  const handleGuestLogin = async () => {
    const timestamp = Date.now();
    const guestEmail = `guest+${timestamp}@demo.local`;
    await handleRegister('Гость', guestEmail, `Guest-${timestamp}`);
  };

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
    if (!confirm('Очистить историю чата?')) return;
    try {
      await api.clearMessages(activeAgent.id);
      setChatHistories((prev) => ({ ...prev, [activeAgent.id]: [] }));
      loadedAgentsRef.current.delete(activeAgent.id);
      setSummarySuccess(false);
    } catch (error) {
      console.error('Failed to clear chat', error);
    }
  };

  const handleGenerateSummary = async () => {
    if (!activeAgent || messages.length < 1) return;
    setIsGeneratingSummary(true);
    try {
      const { file } = await api.generateSummary(activeAgent.id);
      const uploaded = mapFile(file);
      // Добавляем созданный файл напрямую в summaryDocuments (не делаем повторный запрос)
      setSummaryDocuments((prev) => ({
        ...prev,
        [activeAgent.id]: [uploaded, ...(prev[activeAgent.id] ?? [])],
      }));
      // Очищаем кеш загрузки для этого агента, чтобы при следующем переключении файлы перезагрузились
      // Но не очищаем сейчас, так как мы уже добавили файл вручную
      setSummarySuccess(true);
      setTimeout(() => setSummarySuccess(false), 3000);
    } catch (error) {
      console.error('Summary generation failed', error);
      alert('Не удалось создать саммари. Попробуйте позже.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleAddAgent = async () => {
    try {
      const response = await api.createAgent({
        name: 'Новый Агент',
        description: 'Специализированная роль',
        systemInstruction: 'Ты полезный помощник.',
        summaryInstruction: 'Сделай краткий вывод.',
        model: LLMModel.GPT51,
        role: '',
      });
      const mapped = mapAgent(response.agent);
      setAgents((prev) => [...prev, mapped]);
      setActiveAgentId(mapped.id);
      setIsSidebarOpen(false);
    } catch (error) {
      console.error('Failed to create agent', error);
    }
  };

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
      setAgents((prev) => prev.map((item) => (item.id === mapped.id ? mapped : item)));
    } catch (error) {
      console.error('Failed to update agent', error);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    // Запрещаем удаление агентов с ролью
    if (agent && agent.role && agent.role.trim() !== '') {
      alert('Нельзя удалить агента с назначенной ролью.');
      return;
    }
    if (agents.length <= 1) {
      alert('Нельзя удалить последнего агента.');
      return;
    }
    if (!confirm('Удалить агента и его историю?')) return;
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
    } catch (error: any) {
      console.error('Failed to delete agent', error);
      alert(error?.message || 'Не удалось удалить агента.');
    }
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
        const { file: uploaded } = await api.uploadFile(activeAgent.id, {
          name: file.name,
          mimeType: file.type || 'text/plain',
          content: base64,
        });
        uploads.push(mapFile(uploaded));
      } catch (error: any) {
        console.error('File upload failed', error);
        errors.push(`Не удалось загрузить ${file.name}: ${error?.message || 'Неизвестная ошибка'}`);
      }
    }

    if (errors.length > 0) {
      alert(`Ошибки при загрузке файлов:\n${errors.join('\n')}`);
    }

    if (uploads.length > 0) {
      setAgents((prev) =>
        prev.map((agent) =>
          agent.id === activeAgent.id ? { ...agent, files: [...uploads, ...agent.files] } : agent,
        ),
      );
      alert(`Успешно загружено файлов: ${uploads.length}`);
    } else if (errors.length === 0) {
      alert('Не удалось загрузить файлы');
    }
  };

  const handleRemoveFile = async (fileId: string) => {
    if (!activeAgent) return;
    
    // Находим файл для отображения имени в подтверждении
    const fileToRemove = activeAgent.files.find(f => f.id === fileId) || 
                        (summaryDocuments[activeAgent.id] ?? []).find(f => f.id === fileId);
    
    if (!fileToRemove) return;
    
    // Показываем окно подтверждения
    const confirmed = confirm(`Удалить файл "${fileToRemove.name}"?\n\nЭто действие нельзя отменить.`);
    if (!confirmed) return;
    
    try {
      await api.deleteFile(activeAgent.id, fileId);
      
      // Проверяем, является ли файл summary (по имени начинается с "Summary")
      if (fileToRemove.name.startsWith('Summary')) {
        // Удаляем из summaryDocuments
        setSummaryDocuments((prev) => ({
          ...prev,
          [activeAgent.id]: (prev[activeAgent.id] ?? []).filter((file) => file.id !== fileId),
        }));
      } else {
        // Удаляем из agent.files (обычные файлы)
        setAgents((prev) =>
          prev.map((agent) =>
            agent.id === activeAgent.id
              ? { ...agent, files: agent.files.filter((file) => file.id !== fileId) }
              : agent,
          ),
        );
      }
    } catch (error) {
      console.error('Failed to remove file', error);
      alert('Не удалось удалить файл. Попробуйте позже.');
    }
  };

  const renderAuthOrLoader = () => {
    if (authToken && isBootstrapping) {
      return (
        <div className="flex items-center justify-center h-full bg-black text-white">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mx-auto" />
            <p className="text-sm text-white/70">Загружаем рабочее пространство…</p>
          </div>
        </div>
      );
    }

    if (!currentUser) {
      return (
        <AuthPage
          onLogin={handleLogin}
          onRegister={handleRegister}
          onGuestLogin={handleGuestLogin}
          onResetPassword={handleResetPassword}
          error={authError}
        />
      );
    }

    if (!activeAgent) {
      return (
        <div className="flex items-center justify-center h-full bg-black text-white">
          <div className="text-center space-y-4">
            <p className="text-xl font-semibold">Создайте первого агента, чтобы начать работу</p>
            <button
              className="px-4 py-2 bg-white text-black rounded-full font-semibold"
              onClick={handleAddAgent}
            >
              Создать агента
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  const authView = renderAuthOrLoader();
  if (authView) {
    return authView;
  }

  return (
    <div className="flex h-full bg-black text-white font-sans overflow-hidden">
      <AgentSidebar 
        projectName={PROJECT_NAME}
        agents={agents}
        activeAgentId={activeAgent?.id ?? null}
        onSelectAgent={setActiveAgentId}
        onAddAgent={() => {
          handleAddAgent();
        }}
        onDeleteAgent={handleDeleteAgent}
        isOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
        onOpenDocs={() => setIsDocsOpen(true)}
        onGenerateSummary={handleGenerateSummary}
        isGeneratingSummary={isGeneratingSummary}
        summarySuccess={summarySuccess}
        currentUser={currentUser}
        onLogout={handleLogout}
        documentsCount={projectDocuments.length}
      />

      <main className="flex-1 flex flex-col relative h-full w-full overflow-hidden transition-all duration-300">
        <header className="flex-shrink-0 h-16 m-2 bg-black/60 backdrop-blur-xl border border-white/10 rounded-[1.5rem] shadow-2xl flex items-center justify-between px-6 z-30">
           <div className="flex items-center gap-3 overflow-hidden">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden p-2 -ml-2 text-white/60 hover:text-white"
              >
                <Menu size={20} />
              </button>
              
              <div>
                 <div className="flex items-center gap-2">
                    <h2 className="font-bold text-lg tracking-tight text-white truncate max-w-[150px] sm:max-w-xs">
                      {activeAgent.name}
                    </h2>
                    <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-bold text-white/50 border border-white/5">AI</span>
                    
                    <button 
                      onClick={() => setIsSettingsOpen(true)}
                      className="ml-1 p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-all"
                      title="Agent Settings"
                    >
                      <Settings size={16} />
                    </button>
                 </div>
                 
                 <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 mt-1 rounded-full border transition-all duration-300 ${modelBadgeClass}`}>
                    <ModelBadgeIcon size={10} className={isUltraModel ? 'text-emerald-300' : isMiniModel ? 'text-amber-400' : 'text-pink-400'} />
                    <span className="text-[9px] font-bold uppercase tracking-wider opacity-90">
                      {modelBadgeLabel}
                    </span>
                 </div>
              </div>
           </div>

           <div className="flex items-center gap-2">
              <button 
                onClick={handleClearChat}
                className={`p-2 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors ${
                  !activeAgent ? 'opacity-40 cursor-not-allowed' : ''
                }`}
                title="Clear Chat"
                disabled={!activeAgent}
              >
                <Trash2 size={18} />
              </button>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin relative">
           {messages.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20 pointer-events-none">
                 <Bot size={64} className="mb-4 opacity-20" />
                 <p className="text-sm font-medium">
                   Начните диалог с {activeAgent?.name || 'агентом'}
                 </p>
              </div>
           )}
           
           {messages.map((msg) => (
             <MessageBubble key={msg.id} message={msg} />
           ))}
           <div ref={messagesEndRef} />
        </div>

        <div className="flex-shrink-0 p-4 sm:p-6 bg-gradient-to-t from-black via-black/80 to-transparent z-20">
           <ChatInput onSend={handleSendMessage} disabled={isLoading || !activeAgent} />
           <div className="text-center mt-3">
              <p className="text-[10px] text-white/20">
                 AI can make mistakes. Review generated information.
              </p>
           </div>
        </div>

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
        />
      )}

      {activeAgent && (
        <ProjectDocumentsModal 
          isOpen={isDocsOpen}
          onClose={() => setIsDocsOpen(false)}
          documents={projectDocuments}
          onRemoveFile={handleRemoveFile}
          agentRole={activeAgent.role}
          agents={agents}
          onAgentClick={(agentId) => {
            // TODO: Запуск агента с документом
            console.log('Agent click:', agentId);
            // Переключимся на этого агента
            setActiveAgentId(agentId);
            setIsDocsOpen(false);
          }}
          onOpenAgentSettings={(agentId) => {
            // Открываем настройки выбранного агента
            const agent = agents.find(a => a.id === agentId);
            if (agent) {
              setActiveAgentId(agentId);
              setIsSettingsOpen(true);
              setIsDocsOpen(false);
            }
          }}
        />
      )}

    </div>
  );
}