import React, { useState, useEffect } from 'react';
import { X, FileText, Download, Calendar, Eye, Trash2, Loader2, ArrowLeft, Maximize2, Edit, Save, ExternalLink, Upload, ChevronDown, ChevronLeft } from 'lucide-react';
import { UploadedFile, Agent, Project, User } from '../../types';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { api } from '../../services/api';
import { InlineHint } from '../InlineHint';
import { useOnboarding } from '../OnboardingContext';
import { DocumentsSidebar } from './DocumentsSidebar';
import { SyntaxHighlighterWrapper } from './SyntaxHighlighterWrapper';
import { useDocumentSelection } from '../../hooks/documents/useDocumentSelection';
import { useDocumentTabs } from '../../hooks/documents/useDocumentTabs';
import { useDocumentEditor } from '../../hooks/documents/useDocumentEditor';
import { usePrototypeGeneration } from '../../hooks/documents/usePrototypeGeneration';
import { usePrototypeVersions } from '../../hooks/documents/usePrototypeVersions';
import { hasRole, getAgentName, formatDateTime } from '../../utils/documentHelpers';
import { getPrototypeContent } from '../../utils/prototypeHelpers';
import { getDocumentDisplayName, formatDocumentDateTime } from './helpers';

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
  onFileUpload?: () => void;
  onRemoveAgentFile?: (fileId: string) => void;
  onAgentFilesUpdate?: (agentId: string, files: UploadedFile[]) => void;
  onShowConfirm?: (title: string, message: string, onConfirm: () => void, variant?: 'danger' | 'warning' | 'info') => void;
  onShowAlert?: (message: string, title?: string, variant?: 'success' | 'error' | 'info' | 'warning', duration?: number) => void;
  currentUser?: User | null;
}

export const ProjectDocumentsModal: React.FC<ProjectDocumentsModalProps> = ({
  isOpen,
  onClose,
  documents,
  onRemoveFile,
  agents = [],
  project,
  onFileUpload,
  onDocumentUpdate,
  onShowAlert,
  onShowConfirm,
  currentUser
}) => {
  const { shouldShowStep, completeStep } = useOnboarding();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isVerstkaFullscreen, setIsVerstkaFullscreen] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  // Используем хуки для управления состоянием
  const {
    selectedFileId,
    setSelectedFileId,
    localSelectedFile,
    setLocalSelectedFile,
    selectedFile,
  } = useDocumentSelection({ documents, isOpen });

  const {
    activeTab,
    setActiveTab,
    prototypeSubTab,
    setPrototypeSubTab,
  } = useDocumentTabs({ selectedFile, agents, isOpen });

  const {
    isEditing,
    editedContent,
    setEditedContent,
    isSaving,
    handleEdit,
    handleCancelEdit,
    handleSaveEdit,
    decodeContent,
  } = useDocumentEditor({ selectedFile, onDocumentUpdate, onShowAlert });

  const {
    prototypeVersions,
    setPrototypeVersions,
    selectedVersionNumber,
    setSelectedVersionNumber,
    isLoadingVersions,
    isVersionDropdownOpen,
    setIsVersionDropdownOpen,
  } = usePrototypeVersions({ selectedFileId, activeTab, documents, isOpen });

  const documentCreatorAgent = selectedFile?.agentId
    ? agents.find(agent => agent.id === selectedFile.agentId)
    : null;

  const showDSLButtons = documentCreatorAgent && hasRole(documentCreatorAgent.role, "copywriter");
  const showVerstkaSubTabs = documentCreatorAgent && hasRole(documentCreatorAgent.role, "verstka");

  const {
    isGeneratingPrototype,
    handleGenerateResult,
  } = usePrototypeGeneration({
    selectedFile,
    documentCreatorAgent,
    selectedFileId,
    onDocumentUpdate,
    onShowAlert,
    setActiveTab,
    setPrototypeVersions,
    setSelectedVersionNumber,
  });

  // Загружаем состояние sidebar из localStorage
  useEffect(() => {
    const saved = localStorage.getItem('documents-sidebar-collapsed');
    if (saved !== null) {
      setIsSidebarCollapsed(saved === 'true');
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem('documents-sidebar-collapsed', String(newState));
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

    if (selectedFileId === fileId) {
      setSelectedFileId(null);
      setLocalSelectedFile(null);
    }

    onRemoveFile(fileId);
  };

  const handleOpenInNewTab = () => {
    const fileToUse = localSelectedFile || selectedFile;
    if (!fileToUse) return;

    const versionParam = selectedVersionNumber !== null ? `?v=${selectedVersionNumber}` : '';
    const url = `${window.location.origin}/#/prototype/${fileToUse.id}${versionParam}`;
    window.open(url, '_blank');
  };

  const getDisplayContent = () => {
    const fileToUse = localSelectedFile || selectedFile;
    if (!fileToUse) return null;

    if (activeTab === 'text') {
      return fileToUse.data;
    } else if (activeTab === 'prototype') {
      return getPrototypeContent(fileToUse, prototypeVersions, selectedVersionNumber, prototypeSubTab);
    }
    return null;
  };

  const renderPrototypeContent = (isFullscreenView = false) => {
    const content = getDisplayContent();

    if (prototypeSubTab === 'dsl' || prototypeSubTab === 'html') {
      if (content) {
        return (
          <div className="overflow-auto w-full flex-1 flex flex-col" style={{ minHeight: 0, maxHeight: '100%' }}>
            <SyntaxHighlighterWrapper
              language={prototypeSubTab === 'dsl' ? 'markdown' : 'html'}
              isFullscreenView={isFullscreenView}
            >
              {content}
            </SyntaxHighlighterWrapper>
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

    if (content) {
      return (
        <div className="w-full flex-1 relative" style={{ minHeight: 0, maxHeight: '100%' }}>
          <iframe
            srcDoc={content}
            className="absolute inset-0 w-full h-full border-0 rounded-xl"
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

  if (!isOpen) return null;

  const documentsHintStep = {
    id: 'documents-modal-hint',
    component: 'inline' as const,
    content: {
      title: 'Документы проекта',
      description: 'Здесь отображаются все документы вашего проекта. Документы доступны всем агентам проекта и используются ими для контекста при ответах. Вы можете сохранять диалоги с агентами через кнопку "Save" в чате.',
      examples: [
        'Документы доступны всем агентам проекта',
        'Используйте кнопку "Save" в чате для сохранения диалогов',
        'Агенты используют документы для контекста при ответах',
      ],
    },
    showOnce: true,
  };

  const shouldRenderDocumentsHint = shouldShowStep(documentsHintStep);

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
        <DocumentsSidebar
          documents={documents}
          selectedFileId={selectedFileId}
          onSelectFile={setSelectedFileId}
          project={project}
          onClose={onClose}
          onFileUpload={onFileUpload}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={toggleSidebar}
        />

        {/* Preview Area */}
        <div 
          className={`flex-1 md:flex flex-col bg-black relative min-h-0 transition-all duration-300 ease-in-out ${!selectedFile ? 'hidden md:flex' : 'flex'}`}
          style={{ 
            width: isSidebarCollapsed ? 'calc(100% - 60px)' : undefined,
            transitionProperty: 'width',
            willChange: 'width'
          }}
        >
          {/* Mobile Header */}
          <div className="md:hidden sticky top-0 z-20 p-4 border-b border-white/10 flex items-center gap-3 bg-black/60 backdrop-blur-md flex-shrink-0" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
            <button onClick={() => setSelectedFileId(null)} className="p-2.5 text-white hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors" aria-label="К списку документов">
              <ArrowLeft size={20} className="font-bold" />
            </button>
            <span className="font-medium truncate text-white">
              {selectedFile ? getDocumentDisplayName(selectedFile, agents) : ''}
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
              <div className="max-w-6xl mx-auto w-full h-full flex flex-col">
                {!(activeTab === 'prototype' && prototypeSubTab === 'preview') && !(activeTab === 'prototype' && showVerstkaSubTabs && prototypeSubTab !== 'preview' && isVerstkaFullscreen) && (
                  <div className="mb-8 pb-6 border-b border-white/10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold tracking-wider uppercase">
                        {selectedFile ? getAgentName(selectedFile, agents) : 'Документ'}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-6 text-sm text-white/40">
                      <div className="flex items-center gap-6">
                        <span className="flex items-center gap-1.5"><Calendar size={14} /> {selectedFile ? formatDocumentDateTime(selectedFile) : new Date().toLocaleString()}</span>
                        {showVerstkaSubTabs && prototypeSubTab === 'preview' && (
                          <>
                            <button
                              onClick={() => setIsVerstkaFullscreen(true)}
                              className="px-4 py-2 text-sm font-medium flex items-center gap-2 text-white/70 hover:text-white border border-white/10 rounded-lg hover:bg-white/5"
                            >
                              <Maximize2 size={16} />
                              Развернуть
                            </button>
                            <button
                              onClick={handleOpenInNewTab}
                              className="px-4 py-2 text-sm font-medium flex items-center gap-2 text-white/70 hover:text-white border border-white/10 rounded-lg hover:bg-white/5"
                            >
                              <ExternalLink size={16} />
                              Открыть в новой вкладке
                            </button>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {activeTab === 'text' && !selectedFile.type.includes('image') && (
                          isEditing ? (
                            <>
                              <button
                                onClick={handleCancelEdit}
                                disabled={isSaving}
                                className="px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
                                title="Отменить"
                                aria-label="Отменить редактирование"
                              >
                                <span className="text-xs font-semibold hidden sm:inline">Отменить</span>
                                <X size={16} />
                              </button>
                              <button
                                onClick={handleSaveEdit}
                                disabled={isSaving}
                                className="px-3 py-2 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
                                title="Сохранить"
                                aria-label="Сохранить изменения"
                              >
                                {isSaving && <Loader2 size={14} className="animate-spin" />}
                                <span className="text-xs font-semibold hidden sm:inline">Сохранить</span>
                                <Save size={16} />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={handleEdit}
                              className="px-3 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all flex items-center gap-2"
                              title="Редактировать"
                              aria-label="Редактировать документ"
                            >
                              <span className="text-xs font-semibold hidden sm:inline">Редактировать</span>
                              <Edit size={16} />
                            </button>
                          )
                        )}
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

                {/* Tabs */}
                {(showDSLButtons || isAdmin) && (
                  <div className="mb-6 flex items-center gap-4 border-b border-white/10 flex-wrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveTab('text')}
                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'text'
                          ? 'text-white border-white/40'
                          : 'text-white/50 border-transparent hover:text-white/70'
                          }`}
                      >
                        Текст
                      </button>
                      <button
                        onClick={() => setActiveTab('prototype')}
                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'prototype'
                          ? 'text-cyan-400 border-cyan-400/40'
                          : 'text-white/50 border-transparent hover:text-white/70'
                          }`}
                      >
                        Прототип
                      </button>
                    </div>

                    {showDSLButtons && !isEditing && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleGenerateResult();
                        }}
                        disabled={isGeneratingPrototype}
                        className="text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
                      >
                        {isGeneratingPrototype ? (
                          <span className="flex items-center gap-2">
                            <span className="relative flex items-center justify-center">
                              <span className="absolute inset-0 bg-cyan-500/20 blur-md rounded-full animate-pulse"></span>
                              <Loader2 size={14} className="relative animate-spin text-cyan-400" />
                            </span>
                            <span className="flex flex-col items-start">
                              <span className="leading-tight">Генерация прототипа...</span>
                              <span className="text-xs text-cyan-400/70 leading-tight">В среднем до 3 минут</span>
                            </span>
                          </span>
                        ) : (
                          "Сгенерировать прототип"
                        )}
                      </button>
                    )}

                    {/* Sub-tabs for Prototype */}
                    {activeTab === 'prototype' && (
                      <div className="flex items-center gap-2 ml-auto">
                        {showDSLButtons && isAdmin && (
                          <>
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
                          </>
                        )}

                        {/* Version dropdown */}
                        {prototypeVersions.length > 0 && (
                          <div className="relative version-dropdown-container">
                            <button
                              onClick={() => setIsVersionDropdownOpen(!isVersionDropdownOpen)}
                              className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 flex items-center gap-1.5"
                              title="Выбрать версию"
                            >
                              <span>Версия {selectedVersionNumber || '?'}</span>
                              <ChevronDown size={14} className={isVersionDropdownOpen ? 'rotate-180' : ''} />
                            </button>
                            {isVersionDropdownOpen && (
                              <div className="absolute right-0 top-full mt-1 bg-black/95 backdrop-blur-md border border-white/10 rounded-lg shadow-xl z-50 min-w-[200px] max-h-[200px] overflow-y-auto version-dropdown-container">
                                {prototypeVersions.map((version) => (
                                  <div
                                    key={version.id}
                                    className={`flex items-center justify-between group ${
                                      selectedVersionNumber === version.versionNumber
                                        ? 'bg-cyan-500/20'
                                        : ''
                                    }`}
                                  >
                                    <button
                                      onClick={() => {
                                        setSelectedVersionNumber(version.versionNumber);
                                        setIsVersionDropdownOpen(false);
                                      }}
                                      className={`flex-1 text-left px-3 py-2 text-xs transition-colors ${
                                        selectedVersionNumber === version.versionNumber
                                          ? 'text-cyan-400'
                                          : 'text-white/70 hover:text-white hover:bg-white/5'
                                      }`}
                                    >
                                      Версия {version.versionNumber}
                                    </button>
                                    {prototypeVersions.length > 1 && onShowConfirm && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setIsVersionDropdownOpen(false);
                                          if (onShowConfirm) {
                                            onShowConfirm(
                                              'Удалить версию',
                                              `Вы уверены, что хотите удалить версию ${version.versionNumber}? Это действие нельзя отменить.`,
                                              async () => {
                                                try {
                                                  await api.deletePrototypeVersion(selectedFileId!, version.versionNumber);
                                                  const { versions } = await api.getPrototypeVersions(selectedFileId!);
                                                  setPrototypeVersions(versions);
                                                  if (selectedVersionNumber === version.versionNumber) {
                                                    if (versions.length > 0) {
                                                      setSelectedVersionNumber(versions[0].versionNumber);
                                                    } else {
                                                      setSelectedVersionNumber(null);
                                                    }
                                                  }
                                                  if (onDocumentUpdate && selectedFile) {
                                                    const updatedFile = documents.find(d => d.id === selectedFileId);
                                                    if (updatedFile) {
                                                      onDocumentUpdate(updatedFile);
                                                    }
                                                  }
                                                  if (onShowAlert) {
                                                    onShowAlert('Версия успешно удалена', 'Успех', 'success');
                                                  }
                                                } catch (error: any) {
                                                  console.error('Failed to delete version:', error);
                                                  if (onShowAlert) {
                                                    onShowAlert(`Не удалось удалить версию: ${error?.message || 'Неизвестная ошибка'}`, 'Ошибка', 'error');
                                                  }
                                                }
                                              },
                                              'danger'
                                            );
                                          }
                                        }}
                                        className="px-2 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Удалить версию"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        <button
                          onClick={handleOpenInNewTab}
                          className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5"
                          title="Открыть в новом окне"
                        >
                          <ExternalLink size={14} />
                          <span>Открыть</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div
                  className="bg-black/50 backdrop-blur-sm border-[5px] border-white/10 shadow-inner rounded-[2rem] overflow-hidden flex-1 p-4 sm:p-6 md:p-8"
                  style={{ margin: 0, display: 'flex', flexDirection: 'column', maxHeight: '100%' }}
                >
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

                      if ((activeTab === 'prototype' && showDSLButtons) || showVerstkaSubTabs) {
                        return renderPrototypeContent();
                      }

                      if (content === null) {
                        return (
                          <div className="flex flex-col items-center justify-center h-60 text-white/30 text-center">
                            <p className="text-base font-medium mb-2">Нет контента</p>
                          </div>
                        );
                      }

                      if (isEditing) {
                        return (
                          <textarea
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            className="w-full h-full min-h-[500px] bg-black/30 text-white p-4 rounded-xl border border-white/10 focus:border-white/30 focus:outline-none resize-none font-mono text-sm"
                            placeholder="Введите текст документа..."
                          />
                        );
                      }

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
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenInNewTab}
                className="px-4 py-2 text-sm font-medium flex items-center gap-2 text-white/70 hover:text-white border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
              >
                <ExternalLink size={16} />
                Открыть в новой вкладке
              </button>
              <button
                onClick={() => setIsVerstkaFullscreen(false)}
                className="p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>
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


