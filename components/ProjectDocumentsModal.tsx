import React, { useState, useEffect } from 'react';
import { X, FileText, Download, Calendar, Eye, Trash2, Loader2, ArrowLeft, Maximize2 } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { UploadedFile, Agent, Project, User } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { api } from '../services/api';
import { InlineHint } from './InlineHint';
import { useOnboarding } from './OnboardingContext';

const FILE_SIZE_LIMIT = 2 * 1024 * 1024;

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

interface ProjectDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: UploadedFile[];
  onRemoveFile?: (fileId: string) => void;
  agents?: Agent[];
  project?: Project | null;
  onAgentClick?: (agentId: string) => void;
  onOpenAgentSettings?: (agentId: string) => void;
  onDocumentUpdate?: (file: UploadedFile) => void;
  onUpdateAgent?: (updatedAgent: Agent) => void;
  onFileUpload?: (files: FileList) => void;
  onRemoveAgentFile?: (fileId: string) => void;
  onAgentFilesUpdate?: (agentId: string, files: UploadedFile[]) => void;
  onShowConfirm?: (title: string, message: string, onConfirm: () => void, variant?: 'danger' | 'warning' | 'info') => void;
  onShowAlert?: (message: string, title?: string, variant?: 'success' | 'error' | 'info' | 'warning') => void;
  currentUser?: User | null;
}

export const ProjectDocumentsModal: React.FC<ProjectDocumentsModalProps> = ({
  isOpen,
  onClose,
  documents,
  onRemoveFile,
  agents = [],
  project,
  onAgentClick,
  onOpenAgentSettings,
  onDocumentUpdate,
  onUpdateAgent,
  onFileUpload,
  onRemoveAgentFile,
  onAgentFilesUpdate,
  onShowConfirm,
  onShowAlert,
  currentUser
}) => {
  const { shouldShowStep, completeStep } = useOnboarding();
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'text' | 'prototype'>('text');
  const [prototypeSubTab, setPrototypeSubTab] = useState<'preview' | 'dsl' | 'html'>('preview');
  const [isGeneratingPrototype, setIsGeneratingPrototype] = useState(false);
  const [localSelectedFile, setLocalSelectedFile] = useState<UploadedFile | null>(null);
  const [isVerstkaFullscreen, setIsVerstkaFullscreen] = useState(false);

  const isAdmin = currentUser?.role === 'admin';



  function setActiveTabSafe(tab: 'text' | 'prototype') {
    setActiveTab(tab);
    if (tab !== 'prototype') {
      setIsVerstkaFullscreen(false);
    }
    // Сбрасываем под-таб при переключении
    setPrototypeSubTab('preview');
  }

  // Helper function to check if agent has role
  const hasRole = (agentRole: string | undefined, roleName: string): boolean => {
    if (!agentRole) return false;
    const roles = agentRole.split(',').map(r => r.trim().toLowerCase());
    return roles.includes(roleName.toLowerCase());
  };

  // Сбрасываем таб при смене документа или открытии модального окна
  useEffect(() => {
    if (isOpen && selectedFileId) {
      const file = documents.find(doc => doc.id === selectedFileId);
      if (file) {
        const allAgents = agents;
        const creatorAgent = file.agentId ? allAgents.find(agent => agent.id === file.agentId) : null;
        const hasVerstkaRole = creatorAgent && hasRole(creatorAgent?.role, "verstka");

        if (hasVerstkaRole) {
          setActiveTabSafe('prototype');
          setPrototypeSubTab('preview');
        } else {
          setActiveTabSafe('text');
          setPrototypeSubTab('preview');
        }
        setIsVerstkaFullscreen(false);
      }
    } else if (!isOpen) {
      // Сбрасываем таб при закрытии модального окна
      setActiveTabSafe('text');
      setPrototypeSubTab('preview');
      setIsVerstkaFullscreen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFileId, isOpen]);

  // Синхронизируем локальное состояние с documents prop при смене файла
  // Не перезаписываем если локальный файл уже имеет результаты генерации
  useEffect(() => {
    if (selectedFileId) {
      const fileFromProps = documents.find(doc => doc.id === selectedFileId);
      if (fileFromProps) {
        setLocalSelectedFile(prev => {
          // Если локальный файл уже существует и имеет dslContent или verstkaContent - сохраняем его
          if (prev && prev.id === selectedFileId) {
            const hasLocalContent = (prev.dslContent && prev.dslContent.length > 0) ||
              (prev.verstkaContent && prev.verstkaContent.length > 0);
            const hasPropContent = (fileFromProps.dslContent && fileFromProps.dslContent.length > 0) ||
              (fileFromProps.verstkaContent && fileFromProps.verstkaContent.length > 0);

            // Если локальный файл имеет контент, который есть и в prop - берем prop (он новее)
            // Если локальный файл имеет контент, которого нет в prop - оставляем локальный
            if (hasLocalContent && !hasPropContent) {
              return prev;
            }
          }
          return fileFromProps;
        });
      } else {
        // Если выбранный файл не найден в списке документов (был удален), сбрасываем выбор
        setSelectedFileId(null);
        setLocalSelectedFile(null);
      }
    } else {
      setLocalSelectedFile(null);
    }
  }, [documents, selectedFileId]);

  const getAgentName = (doc: UploadedFile) => {
    // Ищем агента в обоих массивах: реальные агенты проекта и шаблоны агентов
    const allAgents = agents;

    // Сначала пытаемся найти по agentId
    if (doc.agentId) {
      const agent = allAgents.find(agent => agent.id === doc.agentId);
      if (agent) {
        return agent.name;
      }
    }

    // Если агент не найден по ID, пытаемся извлечь название из имени файла
    // Формат имени: "Summary - {AgentName} - {Date}" или "Summary – {AgentName} – {Date}"
    // Поддерживаем разные типы тире: дефис (-), длинное тире (–), среднее тире (—)
    const nameMatch = doc.name.match(/^Summary\s*[-–—]\s*(.+?)\s*[-–—]\s*\d/);
    if (nameMatch && nameMatch[1]) {
      const agentNameFromFile = nameMatch[1].trim();
      // Проверяем, есть ли агент с таким именем (на случай если ID не совпадает, но имя есть)
      const agentByName = allAgents.find(agent => agent.name === agentNameFromFile);
      if (agentByName) {
        return agentByName.name;
      }
      // Если агента с таким именем нет в списке, всё равно возвращаем имя из файла
      return agentNameFromFile;
    }

    // Альтернативный формат: "Документ - {AgentName} - {Date}"
    const altNameMatch = doc.name.match(/^Документ\s*[-–—]\s*(.+?)\s*[-–—]\s*\d/);
    if (altNameMatch && altNameMatch[1]) {
      return altNameMatch[1].trim();
    }

    // Если ничего не найдено, возвращаем "Документ"
    return 'Документ';
  };

  const extractTimestamp = (doc: UploadedFile) => {
    const parts = doc.name.split(' - ');
    return parts.length > 1 ? parts[parts.length - 1].trim() : doc.name;
  };

  const formatTime24h = (doc: UploadedFile) => {
    const timestamp = extractTimestamp(doc);
    try {
      // Парсим дату в формате "11/22/2025, 6:53:14 PM"
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        // Если не удалось распарсить, возвращаем исходную строку
        return timestamp;
      }
      // Форматируем только время в 24-часовом формате
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    } catch (e) {
      return timestamp;
    }
  };

  const formatDateTime = (doc: UploadedFile) => {
    const timestamp = extractTimestamp(doc);
    try {
      // Парсим дату в формате "11/22/2025, 6:53:14 PM"
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        // Если не удалось распарсить, возвращаем исходную строку
        return timestamp;
      }
      // Форматируем дату в формате DD.MM.YYYY
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      // Форматируем время в 24-часовом формате
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');
      return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
    } catch (e) {
      return timestamp;
    }
  };

  const getDocumentDisplayName = (doc: UploadedFile) => {
    return `${getAgentName(doc)} - ${extractTimestamp(doc)}`;
  };


  if (!isOpen) return null;


  const selectedFile = localSelectedFile || documents.find(doc => doc.id === selectedFileId);


  // Находим агента-создателя документа
  const allAgents = agents;
  const documentCreatorAgent = selectedFile?.agentId
    ? allAgents.find(agent => agent.id === selectedFile.agentId)
    : null;

  // Показывать кнопки только если документ создан агентом-копирайтером
  const showDSLButtons = documentCreatorAgent && hasRole(documentCreatorAgent.role, "copywriter");

  console.log('[ProjectDocumentsModal] Tab visibility:', {
    isAdmin,
    currentUserRole: currentUser?.role,
    showDSLButtons,
    shouldShowTabs: activeTab === 'prototype' && showDSLButtons && isAdmin,
    activeTab,
    documentCreatorAgentName: documentCreatorAgent?.name,
    documentCreatorAgentRole: documentCreatorAgent?.role,
  });

  // Показывать подтабы только если документ создан агентом-верстальщиком
  const showVerstkaSubTabs = documentCreatorAgent && hasRole(documentCreatorAgent.role, "verstka");

  // Находим агентов DSL и Верстка по ролям (могут быть отдельными агентами или частью копирайтера)
  const dslAgent = allAgents.find(agent => {
    const roles = agent.role ? agent.role.split(',').map(r => r.trim()) : [];
    return roles.includes('dsl');
  });
  const verstkaAgent = allAgents.find(agent => {
    const roles = agent.role ? agent.role.split(',').map(r => r.trim()) : [];
    return roles.includes('verstka');
  });


  const decodeContent = (base64: string) => {
    try {
      return decodeURIComponent(escape(window.atob(base64)));
    } catch (e) {
      return "Не удалось прочитать файл или это бинарный файл.";
    }
  };


  const handleDownload = (file: UploadedFile, e: React.MouseEvent) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = `data:${file.type};base64,${file.data}`;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onRemoveFile) return;

    // onRemoveFile в App.tsx уже показывает подтверждение, поэтому просто вызываем его
    // Но сначала сбрасываем выбор, если удаляемый файл был выбран
    if (selectedFileId === fileId) {
      setSelectedFileId(null);
      setLocalSelectedFile(null);
    }

    // Вызываем onRemoveFile, который покажет подтверждение и выполнит удаление
    onRemoveFile(fileId);
  };

  const handleGenerateResult = async () => {
    if (!selectedFile || !documentCreatorAgent) return;

    setIsGeneratingPrototype(true);

    try {
      const { file } = await api.generatePrototype(
        documentCreatorAgent.id,
        selectedFile.id
      );

      // Создаём обновлённый файл
      const updatedFile: UploadedFile = {
        id: file.id,
        name: file.name,
        type: file.mimeType,
        data: file.content,
        agentId: file.agentId,
        dslContent: file.dslContent,
        verstkaContent: file.verstkaContent,
      };

      console.log('[ProjectDocumentsModal] Generated result:', {
        hasDSL: !!updatedFile.dslContent,
        hasVerstka: !!updatedFile.verstkaContent,
        dslLength: updatedFile.dslContent?.length || 0,
        verstkaLength: updatedFile.verstkaContent?.length || 0,
      });

      // Сразу обновляем локальное состояние для мгновенного отображения
      setLocalSelectedFile(updatedFile);

      // Обновляем документ в родительском компоненте
      if (onDocumentUpdate) {
        onDocumentUpdate(updatedFile);
      }

      // Переключаемся на таб прототипа
      setTimeout(() => {
        setActiveTabSafe('prototype');
      }, 100);
    } catch (error: any) {
      console.error('Failed to generate result:', error);
      if (onShowAlert) {
        onShowAlert(`Не удалось сгенерировать прототип: ${error?.message || 'Неизвестная ошибка'}`, 'Ошибка', 'error');
      } else {
        console.error(`Не удалось сгенерировать прототип: ${error?.message || 'Неизвестная ошибка'}`);
      }
    } finally {
      setIsGeneratingPrototype(false);
    }
  };

  // Получаем контент для отображения в зависимости от активного таба
  const getDisplayContent = () => {
    // Используем localSelectedFile если он есть (может содержать обновленные данные), иначе selectedFile
    const fileToUse = localSelectedFile || selectedFile;
    if (!fileToUse) return null;

    if (activeTab === 'text') {
      return fileToUse.data;
    } else if (activeTab === 'prototype') {
      // Для таба прототипа возвращаем контент в зависимости от под-таба
      if (prototypeSubTab === 'dsl') {
        return fileToUse.dslContent || null;
      }
      // Для preview и html возвращаем verstkaContent
      const content = fileToUse.verstkaContent || null;
      console.log('[ProjectDocumentsModal] getDisplayContent Prototype:', {
        hasContent: !!content,
        contentLength: content?.length || 0,
        selectedFileId: fileToUse.id,
        isLocalSelected: localSelectedFile?.id === fileToUse.id,
        subTab: prototypeSubTab
      });
      return content;
    }
    return null;
  };

  const documentsHintStep = {
    id: 'documents-modal-hint',
    component: 'inline' as const,
    content: {
      title: 'Документы проекта',
      description:
        'Здесь отображаются все документы вашего проекта. Документы доступны всем агентам проекта и используются ими для контекста при ответах. Вы можете сохранять диалоги с агентами через кнопку "Save" в чате.',
      examples: [
        'Документы доступны всем агентам проекта',
        'Используйте кнопку "Save" в чате для сохранения диалогов',
        'Агенты используют документы для контекста при ответах',
      ],
    },
    showOnce: true,
  };

  const shouldRenderDocumentsHint = shouldShowStep(documentsHintStep);

  const renderPrototypeContent = (isFullscreenView = false) => {
    const content = getDisplayContent();

    // Отображение кода (DSL или HTML)
    if (prototypeSubTab === 'dsl' || prototypeSubTab === 'html') {
      if (content) {
        return (
          <div className="overflow-x-auto w-full h-full flex-1 flex flex-col" style={{ minHeight: '60vh' }}>
            <SyntaxHighlighter
              style={vscDarkPlus}
              language={prototypeSubTab === 'dsl' ? 'markdown' : 'html'}
              PreTag="div"
              customStyle={{
                margin: 0,
                borderRadius: isFullscreenView ? '1.5rem' : '1rem',
                padding: isFullscreenView ? '1.5rem' : '1.5rem',
                height: '100%',
                flex: 1,
              }}
            >
              {content}
            </SyntaxHighlighter>
          </div>
        );
      }
      return (
        <div className="flex flex-col items-center justify-center h-60 text-white/30 text-center">
          <p className="text-base font-medium mb-2">
            {prototypeSubTab === 'dsl' ? 'DSL код еще не сгенерирован' : 'HTML код еще не сгенерирован'}
          </p>
          <p className="text-sm text-white/20">
            {prototypeSubTab === 'dsl'
              ? 'Контент появится после генерации DSL агентом'
              : 'Контент появится после генерации Верстальщиком'}
          </p>
        </div>
      );
    }

    // Отображение превью (iframe)
    if (content) {
      // verstkaContent уже является обычным текстом (не base64), используем напрямую
      return (
        <div className="w-full h-full flex-1 relative" style={{ minHeight: '60vh' }}>
          <iframe
            srcDoc={content}
            className="absolute inset-0 w-full h-full border-0"
            title="HTML Preview"
            sandbox="allow-same-origin allow-scripts"
          />
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-60 text-white/30 text-center">
        <p className="text-base font-medium mb-2">Прототип еще не сгенерирован</p>
        <p className="text-sm text-white/20">
          Используйте кнопку "Сгенерировать прототип" для создания HTML-макета
        </p>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-gradient-to-br from-black via-black to-indigo-950/20 flex flex-col overflow-hidden"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {shouldRenderDocumentsHint && (
        <div className="p-4 md:p-6 border-b border-white/10 bg-black/30 backdrop-blur-xl">
          <div className="max-w-4xl mx-auto w-full">
            <InlineHint
              title="Документы проекта"
              description="Здесь отображаются все документы вашего проекта. Документы доступны всем агентам проекта и используются ими для контекста при ответах. Вы можете сохранять диалоги с агентами через кнопку 'Save' в чате."
              examples={[
                'Документы доступны всем агентам проекта',
                'Используйте кнопку "Save" в чате для сохранения диалогов',
                'Агенты используют документы для контекста при ответах',
              ]}
              variant="info"
              collapsible={true}
              defaultExpanded={true}
              dismissible={true}
              onDismiss={() => completeStep('documents-modal-hint')}
            />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Sidebar List */}
        <div className={`w-full md:w-[15%] md:max-w-[220px] border-r border-white/10 flex flex-col bg-black/40 backdrop-blur-xl ${selectedFile ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 sm:p-6 border-b border-white/10 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-amber-500/20 rounded-xl text-amber-400 flex-shrink-0">
                    <FileText size={18} className="sm:w-5 sm:h-5" />
                  </div>
                  <span className="truncate">{project?.name || 'Документы'}</span>
                </h2>
                {project?.projectType && (
                  <p className="text-xs sm:text-sm text-white/50 mt-1 ml-11 sm:ml-12 truncate">
                    {project.projectType.name}
                  </p>
                )}
              </div>
              {/* Mobile Close Button */}
              <button
                onClick={onClose}
                className="md:hidden p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
                aria-label="Закрыть"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2 md:no-scrollbar">
            {documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-60 text-white/40 text-center p-6 border-2 border-dashed border-white/10 rounded-3xl m-4">
                <div className="relative mb-4">
                  <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full animate-pulse"></div>
                  <FileText size={40} className="relative opacity-60" />
                </div>
                <p className="text-base font-semibold text-white/70 mb-2">Нет документов</p>
                <p className="text-xs text-white/50 max-w-[200px]">Используйте кнопку "Сохранить" в чате для создания отчетов.</p>
              </div>
            ) : (
              documents.map(doc => (
                <button
                  key={doc.id}
                  onClick={() => setSelectedFileId(doc.id)}
                  className={`w-full text-left p-4 rounded-2xl transition-all flex items-center gap-4 group relative overflow-hidden ${selectedFileId === doc.id
                    ? 'bg-white/10 shadow-lg border border-white/10'
                    : 'hover:bg-white/5 border border-transparent'
                    }`}
                >
                  {selectedFileId === doc.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400"></div>}

                  <div className="min-w-0 flex-1">
                    <h4 className={`text-sm font-semibold line-clamp-2 ${selectedFileId === doc.id ? 'text-white' : 'text-white/70'}`}>
                      {getDocumentDisplayName(doc)}
                    </h4>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Preview Area */}
        <div className={`flex-1 flex flex-col bg-black/30 relative min-h-0 ${!selectedFile ? 'hidden md:flex' : 'flex'}`}>

          {/* Mobile Header for Preview */}
          <div className="md:hidden sticky top-0 z-20 p-4 border-b border-white/10 flex items-center gap-3 bg-black/60 backdrop-blur-md flex-shrink-0" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
            <button onClick={() => setSelectedFileId(null)} className="p-2.5 text-white hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors" aria-label="К списку документов">
              <ArrowLeft size={20} className="font-bold" />
            </button>
            <span className="font-medium truncate text-white">
              {selectedFile ? getDocumentDisplayName(selectedFile) : ''}
            </span>
            <button onClick={onClose} className="ml-auto p-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors" aria-label="Закрыть">
              <X size={20} />
            </button>
          </div>

          {/* Desktop Close Button */}
          <div className="absolute top-6 right-6 z-10 hidden md:block">
            <button onClick={onClose} className="p-2.5 bg-black/60 backdrop-blur-md hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-colors border border-white/10 shadow-lg">
              <X size={20} />
            </button>
          </div>

          {selectedFile ? (
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-4 md:p-8 lg:p-12">
              <div className="max-w-6xl mx-auto w-full">
                {!(activeTab === 'prototype' && showVerstkaSubTabs && prototypeSubTab !== 'preview' && isVerstkaFullscreen) && (
                  <div className="mb-8 pb-6 border-b border-white/10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold tracking-wider uppercase">
                        {selectedFile ? getAgentName(selectedFile) : 'Документ'}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-6 text-sm text-white/40">
                      <div className="flex items-center gap-6">
                        <span className="flex items-center gap-1.5"><Calendar size={14} /> {selectedFile ? formatDateTime(selectedFile) : new Date().toLocaleString()}</span>

                        {/* Кнопка переключения для документов верстальщика - теперь использует табы админа или скрыта если не админ */
                          /* Если нужно оставить переключение для обычных пользователей для верстальщика, можно добавить логику здесь */
                          /* Но пока используем новую логику табов */
                        }
                        {showVerstkaSubTabs && prototypeSubTab === 'preview' && (
                          <button
                            onClick={() => setIsVerstkaFullscreen(true)}
                            className="px-4 py-2 text-sm font-medium flex items-center gap-2 text-white/70 hover:text-white border border-white/10 rounded-lg hover:bg-white/5"
                          >
                            <Maximize2 size={16} />
                            Развернуть
                          </button>
                        )}

                        {/* Кнопка генерации прототипа */}
                        {showDSLButtons && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              handleGenerateResult();
                            }}
                            disabled={isGeneratingPrototype}
                            className="text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                          >
                            {isGeneratingPrototype && <Loader2 size={14} className="animate-spin" />}
                            Сгенерировать прототип
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleDownload(selectedFile, e)}
                          className="px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all flex items-center gap-2"
                          title="Скачать"
                          aria-label="Скачать документ"
                        >
                          <span className="text-xs font-semibold hidden sm:inline">Скачать</span>
                          <Download size={16} />
                        </button>
                        {onRemoveFile && (
                          <button
                            onClick={(e) => handleDelete(selectedFile.id, e)}
                            className="px-3 py-2 text-white/80 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all flex items-center gap-2"
                            title="Удалить"
                            aria-label="Удалить документ"
                          >
                            <span className="text-xs font-semibold hidden sm:inline">Удалить</span>
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}


                {/* Tabs for copywriter documents */}
                {(showDSLButtons || isAdmin) && (
                  <div className="mb-6 flex items-center justify-between border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveTabSafe('text')}
                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'text'
                          ? 'text-white border-white/40'
                          : 'text-white/50 border-transparent hover:text-white/70'
                          }`}
                      >
                        Текст
                      </button>
                      <button
                        onClick={() => setActiveTabSafe('prototype')}
                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'prototype'
                          ? 'text-cyan-400 border-cyan-400/40'
                          : 'text-white/50 border-transparent hover:text-white/70'
                          }`}
                      >
                        Прототип
                      </button>
                    </div>


                    {/* Sub-tabs for Prototype - only for admins on copywriter documents */}
                    {activeTab === 'prototype' && showDSLButtons && isAdmin && (
                      <div className="flex items-center gap-1 mr-2">
                        <button
                          onClick={() => setPrototypeSubTab('preview')}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${prototypeSubTab === 'preview'
                            ? 'bg-white/10 text-white'
                            : 'text-white/30 hover:text-white/60 hover:bg-white/5'
                            }`}
                        >
                          Preview
                        </button>
                        <button
                          onClick={() => setPrototypeSubTab('dsl')}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${prototypeSubTab === 'dsl'
                            ? 'bg-white/10 text-white'
                            : 'text-white/30 hover:text-white/60 hover:bg-white/5'
                            }`}
                        >
                          DSL
                        </button>
                        <button
                          onClick={() => setPrototypeSubTab('html')}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${prototypeSubTab === 'html'
                            ? 'bg-white/10 text-white'
                            : 'text-white/30 hover:text-white/60 hover:bg-white/5'
                            }`}
                        >
                          HTML
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div
                  className={`bg-black/50 backdrop-blur-sm border-[5px] border-white/10 shadow-inner rounded-[2rem] overflow-hidden flex-1 ${activeTab === 'prototype' ? 'p-0' : 'p-4 sm:p-6 md:p-8'}`}
                  style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
                  {selectedFile && selectedFile.type.includes('image') && activeTab === 'text' ? (
                    <img src={`data:${selectedFile.type};base64,${selectedFile.data}`} alt="Preview" className="max-w-full h-auto rounded-2xl shadow-2xl" />
                  ) : (
                    (() => {
                      if (!selectedFile) {
                        return (
                          <div className="flex flex-col items-center justify-center h-60 text-white/40 text-center px-4">
                            <div className="relative mb-4">
                              <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full animate-pulse"></div>
                              <FileText size={40} className="relative opacity-50" />
                            </div>
                            <p className="text-base font-semibold text-white/60">Выберите документ для просмотра</p>
                          </div>
                        );
                      }
                      const content = getDisplayContent();

                      // Специальная обработка для документов верстальщика или таба прототипа
                      console.log('[ProjectDocumentsModal] Render check:', {
                        activeTab,
                        showVerstkaSubTabs,
                        prototypeSubTab,
                        hasContent: !!content
                      });

                      if ((activeTab === 'prototype' && showDSLButtons) || showVerstkaSubTabs) {
                        return renderPrototypeContent();
                      }

                      // Проверка на пустое состояние для других табов
                      if (content === null) {
                        return (
                          <div className="flex flex-col items-center justify-center h-60 text-white/30 text-center">
                            <p className="text-base font-medium mb-2">Нет контента</p>
                          </div>
                        );
                      }

                      // Обычный рендер для других табов
                      return (
                        <div className="prose prose-invert prose-lg max-w-none overflow-x-auto break-words [&>*]:!my-0 [&>*:first-child]:!mt-0 [&>*:last-child]:!mb-0">
                          <MarkdownRenderer content={decodeContent(content)} />
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-white/30 px-4">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full animate-pulse"></div>
                <div className="relative w-24 h-24 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                  <Eye size={48} className="opacity-50" />
                </div>
              </div>
              <p className="text-lg font-semibold text-white/60 mb-2">Выберите документ</p>
              <p className="text-sm text-white/40 text-center max-w-sm">Выберите документ из списка слева для просмотра</p>
            </div>
          )}
        </div>
      </div>

      {isVerstkaFullscreen && activeTab === 'prototype' && prototypeSubTab === 'preview' && (
        <div className="fixed inset-0 z-[60] bg-black flex flex-col">
          <div className="flex items-center justify-between p-4 bg-black/80 backdrop-blur-md border-b border-white/10">
            <h3 className="text-white font-medium">Просмотр верстки</h3>
            <button
              className="p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 sm:p-8">
            <div className="w-full h-full bg-black/40 border border-white/10 rounded-2xl p-4">
              {renderPrototypeContent(true)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};