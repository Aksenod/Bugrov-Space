import React, { useState, useEffect } from 'react';
import { X, FileText, Download, Calendar, Eye, Trash2, Loader2, ArrowLeft, Maximize2, Edit, Save, ExternalLink, Upload, ChevronDown, ChevronLeft } from 'lucide-react';
import { UploadedFile, Agent, Project, User } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { api } from '../services/api';
import { useOnboarding } from './OnboardingContext';
import { DocumentsSidebar } from './ProjectDocumentsModal/DocumentsSidebar';
import { SyntaxHighlighterWrapper } from './ProjectDocumentsModal/SyntaxHighlighterWrapper';
import { useDocumentSelection } from '../hooks/documents/useDocumentSelection';
import { useDocumentTabs } from '../hooks/documents/useDocumentTabs';
import { useDocumentEditor } from '../hooks/documents/useDocumentEditor';
import { usePrototypeGeneration } from '../hooks/documents/usePrototypeGeneration';
import { usePrototypeVersions } from '../hooks/documents/usePrototypeVersions';
import { hasRole, getAgentName, formatDateTime } from '../utils/documentHelpers';
import { getPrototypeContent } from '../utils/prototypeHelpers';
import { getDocumentDisplayName, formatDocumentDateTime } from './ProjectDocumentsModal/helpers';

interface DocumentsPageProps {
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

export const DocumentsPage: React.FC<DocumentsPageProps> = ({
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
  } = useDocumentSelection({ documents, isOpen: true });

  const {
    activeTab,
    setActiveTab,
    prototypeSubTab,
    setPrototypeSubTab,
  } = useDocumentTabs({ selectedFile, agents, isOpen: true });

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
  } = usePrototypeVersions({ selectedFileId, activeTab, documents, isOpen: true });

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

  return (
    <div
      className="fixed inset-0 z-50 bg-gradient-to-br from-black via-black to-indigo-950/20 flex flex-col overflow-hidden"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
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

                      <div className="inline-flex items-center gap-1.5 px-2.5 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl shadow-lg shadow-indigo-500/10 hover:bg-indigo-500/15 hover:border-indigo-500/40 transition-all duration-200">
                        {activeTab === 'text' && !selectedFile.type.includes('image') && (
                          isEditing ? (
                            <>
                              <button
                                onClick={handleCancelEdit}
                                disabled={isSaving}
                                className="p-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all disabled:opacity-50"
                                title="Отменить"
                                aria-label="Отменить редактирование"
                              >
                                <X size={18} />
                              </button>
                              <button
                                onClick={handleSaveEdit}
                                disabled={isSaving}
                                className="p-2.5 text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-lg transition-all disabled:opacity-50"
                                title="Сохранить"
                                aria-label="Сохранить изменения"
                              >
                                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={handleEdit}
                              className="p-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                              title="Редактировать"
                              aria-label="Редактировать документ"
                            >
                              <Edit size={18} />
                            </button>
                          )
                        )}
                        <button
                          onClick={(e) => handleDownload(selectedFile, e)}
                          className="p-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                          title="Скачать"
                          aria-label="Скачать документ"
                        >
                          <Download size={18} />
                        </button>
                        {onRemoveFile && (
                          <button
                            onClick={(e) => handleDelete(selectedFile.id, e)}
                            className="p-2.5 text-white/80 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Удалить"
                            aria-label="Удалить документ"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tabs + CTA + Version (mobile-first) */}
                {(showDSLButtons || isAdmin) && (
                  <div className="mb-6 w-full">
                    <div className="w-full rounded-xl border border-white/10 bg-white/5 p-3 space-y-2 md:p-3 md:space-y-2">
                      <div className="flex flex-col space-y-2 md:flex-row md:items-center md:gap-2 md:space-y-0">
                        <div className="flex gap-2 overflow-x-auto snap-x md:flex-1" role="tablist">
                          <button
                            role="tab"
                            aria-selected={activeTab === 'text'}
                            aria-controls="documents-tab-text"
                            onClick={() => setActiveTab('text')}
                            className={`flex-1 min-w-[108px] snap-start h-8 px-2 text-[11px] font-semibold rounded-lg border md:min-w-[128px] md:h-9 md:px-3 md:text-xs ${
                              activeTab === 'text'
                                ? 'bg-white/10 text-white border-white/10'
                                : 'text-white/70 border-transparent hover:text-white'
                            } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60`}
                          >
                            Текст
                          </button>
                          <button
                            role="tab"
                            aria-selected={activeTab === 'prototype'}
                            aria-controls="documents-tab-prototype"
                            onClick={() => setActiveTab('prototype')}
                            className={`flex-1 min-w-[108px] snap-start h-8 px-2 text-[11px] font-semibold rounded-lg border md:min-w-[128px] md:h-9 md:px-3 md:text-xs ${
                              activeTab === 'prototype'
                                ? 'bg-white/10 text-white border-white/10'
                                : 'text-white/70 border-transparent hover:text-white'
                            } focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60`}
                          >
                            Прототип
                          </button>
                        </div>

                      </div>

                      {activeTab === 'prototype' && (
                        <div className="flex flex-col gap-2 md:gap-3">
                          {showDSLButtons && isAdmin && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setPrototypeSubTab('preview')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                  prototypeSubTab === 'preview'
                                    ? 'bg-white/10 text-white'
                                    : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                                }`}
                              >
                                Preview
                              </button>
                              <button
                                onClick={() => setPrototypeSubTab('dsl')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                  prototypeSubTab === 'dsl'
                                    ? 'bg-white/10 text-white'
                                    : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                                }`}
                              >
                                DSL
                              </button>
                              <button
                                onClick={() => setPrototypeSubTab('html')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                  prototypeSubTab === 'html'
                                    ? 'bg-white/10 text-white'
                                    : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                                }`}
                              >
                                HTML
                              </button>
                            </div>
                          )}

                          <div className="flex items-center gap-2 w-full flex-wrap">
                            {prototypeVersions.length > 0 ? (
                              <div className="relative version-dropdown-container">
                                <button
                                  onClick={() => setIsVersionDropdownOpen(!isVersionDropdownOpen)}
                                  className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/8 h-8 px-3 text-[11px] font-semibold text-white/80 hover:bg-white/12 hover:text-white active:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 md:h-9 md:text-xs"
                                  title="Выбрать версию"
                                >
                              <span>Ver {selectedVersionNumber || '?'}</span>
                                  <ChevronDown size={14} className={isVersionDropdownOpen ? 'rotate-180' : ''} />
                                </button>
                                {isVersionDropdownOpen && (
                                  <div className="absolute left-0 top-full mt-1 bg-black/95 backdrop-blur-md border border-white/10 rounded-lg shadow-xl z-50 min-w-[200px] max-h-[200px] overflow-y-auto version-dropdown-container">
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
                                          Ver {version.versionNumber}
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
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-white/5 border border-white/10 px-2.5 py-1 text-xs text-white/70">
                                Ver нет
                              </span>
                            )}

                            {showDSLButtons && !isEditing && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleGenerateResult();
                                }}
                                disabled={isGeneratingPrototype}
                                className="flex-1 min-w-[120px] inline-flex items-center justify-center gap-2 rounded-md h-9 px-3 text-xs font-semibold text-white bg-indigo-500 hover:bg-indigo-400 active:bg-indigo-500/90 shadow-[0_10px_30px_-12px_rgba(99,102,241,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:opacity-60 disabled:cursor-not-allowed md:h-9 md:px-3 md:text-xs"
                              >
                                {isGeneratingPrototype ? (
                                  <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Генерация...
                                  </>
                                ) : (
                                  <>⚡ Сгенерировать</>
                                )}
                              </button>
                            )}

                            <button
                              onClick={handleOpenInNewTab}
                              className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/8 h-9 px-3 text-xs font-semibold text-white/80 hover:bg-white/12 hover:text-white active:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 transition-colors md:h-9 md:px-3 md:text-xs"
                              title="Открыть в новом окне"
                            >
                              <ExternalLink size={14} />
                              <span className="sr-only md:inline">Открыть</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div
                  ref={(el) => {
                    // #region agent log
                    if (el) {
                      const computed = window.getComputedStyle(el);
                      fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DocumentsPage.tsx:563',message:'Content container mounted',data:{containerWidth:computed.width,containerMinWidth:computed.minWidth,containerMaxWidth:computed.maxWidth,containerOverflowX:computed.overflowX,containerOverflowY:computed.overflowY,containerDisplay:computed.display,containerFlexDirection:computed.flexDirection,containerClientWidth:el.clientWidth,containerScrollWidth:el.scrollWidth},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                    }
                    // #endregion
                  }}
                  className="bg-black/50 backdrop-blur-sm border-[5px] border-white/10 shadow-inner rounded-[2rem] overflow-y-auto flex-1 p-4 sm:p-6 md:p-8 min-w-0 max-w-full"
                  style={{ margin: 0, display: 'flex', flexDirection: 'column', maxHeight: '100%', overflowX: 'visible' }}
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
                        <div 
                          ref={(el) => {
                            // #region agent log
                            if (el) {
                              const computed = window.getComputedStyle(el);
                              fetch('http://127.0.0.1:7242/ingest/9d98fffd-a48f-4d13-a7f2-828626c8ca26',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'DocumentsPage.tsx:607',message:'Prose wrapper mounted',data:{proseWidth:computed.width,proseMinWidth:computed.minWidth,proseMaxWidth:computed.maxWidth,proseOverflowX:computed.overflowX,proseDisplay:computed.display},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B,E'})}).catch(()=>{});
                            }
                            // #endregion
                          }}
                          className="prose prose-invert prose-lg max-w-none break-words [&>*]:!my-0 [&>*:first-child]:!mt-0 [&>*:last-child]:!mb-0 w-full" style={{ overflowX: 'visible', minWidth: 0 }}>
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

