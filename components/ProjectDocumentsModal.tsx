import React, { useState, useEffect } from 'react';
import { X, FileText, Download, Calendar, Eye, Trash2, Loader2 } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { UploadedFile, Agent } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { api } from '../services/api';

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
  onAgentClick?: (agentId: string) => void;
  onOpenAgentSettings?: (agentId: string) => void;
  onDocumentUpdate?: (file: UploadedFile) => void;
  onUpdateAgent?: (updatedAgent: Agent) => void;
  onFileUpload?: (files: FileList) => void;
  onRemoveAgentFile?: (fileId: string) => void;
  onAgentFilesUpdate?: (agentId: string, files: UploadedFile[]) => void;
  onShowConfirm?: (title: string, message: string, onConfirm: () => void, variant?: 'danger' | 'warning' | 'info') => void;
  onShowAlert?: (message: string, title?: string, variant?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const ProjectDocumentsModal: React.FC<ProjectDocumentsModalProps> = ({
  isOpen,
  onClose,
  documents,
  onRemoveFile,
  agents = [],
  onAgentClick,
  onOpenAgentSettings,
  onDocumentUpdate,
  onUpdateAgent,
  onFileUpload,
  onRemoveAgentFile,
  onAgentFilesUpdate,
  onShowConfirm,
  onShowAlert
}) => {
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'text' | 'dsl' | 'verstka' | 'code' | 'preview'>('text');
  const [isGeneratingDSL, setIsGeneratingDSL] = useState(false);
  const [isGeneratingVerstka, setIsGeneratingVerstka] = useState(false);
  const [localSelectedFile, setLocalSelectedFile] = useState<UploadedFile | null>(null);

  // Helper function to check if agent has role
  const hasRole = (agentRole: string | undefined, roleName: string): boolean => {
    if (!agentRole) return false;
    const roles = agentRole.split(',').map(r => r.trim().toLowerCase());
    return roles.includes(roleName.toLowerCase());
  };

  // Сбрасываем таб при смене документа
  useEffect(() => {
    if (selectedFileId) {
      const file = documents.find(doc => doc.id === selectedFileId);
      if (file) {
        const creatorAgent = file.agentId ? agents.find(agent => agent.id === file.agentId) : null;
        const hasVerstkaRole = creatorAgent && hasRole(creatorAgent?.role, "verstka");
        
        if (hasVerstkaRole) {
          setActiveTab('preview');
        } else {
          setActiveTab('text');
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFileId]);

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
      }
    } else {
      setLocalSelectedFile(null);
    }
  }, [documents, selectedFileId]);

  const getAgentName = (doc: UploadedFile) => {
    if (!doc.agentId) return 'Документ';
    return agents.find(agent => agent.id === doc.agentId)?.name ?? 'Документ';
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

  const getDocumentDisplayName = (doc: UploadedFile) => {
    return `${getAgentName(doc)} - ${extractTimestamp(doc)}`;
  };

  if (!isOpen) return null;

  const selectedFile = localSelectedFile || documents.find(doc => doc.id === selectedFileId);
  
  // Находим агента-создателя документа
  const documentCreatorAgent = selectedFile?.agentId 
    ? agents.find(agent => agent.id === selectedFile.agentId)
    : null;
  
  // Показывать кнопки только если документ создан агентом-копирайтером
  const showDSLButtons = documentCreatorAgent && hasRole(documentCreatorAgent.role, "copywriter");
  
  // Показывать подтабы только если документ создан агентом-верстальщиком
  const showVerstkaSubTabs = documentCreatorAgent && hasRole(documentCreatorAgent.role, "verstka");
  
  // Находим агентов DSL и Верстка по ролям (могут быть отдельными агентами или частью копирайтера)
  const dslAgent = agents.find(agent => {
    const roles = agent.role ? agent.role.split(',').map(r => r.trim()) : [];
    return roles.includes('dsl');
  });
  const verstkaAgent = agents.find(agent => {
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
    
    if (onShowConfirm) {
      onShowConfirm(
        'Удалить документ?',
        'Этот документ будет удален.\n\nЭто действие нельзя отменить.',
        () => {
          onRemoveFile(fileId);
          // Если удаляемый файл был выбран, сбросить выбор
          if (selectedFileId === fileId) {
            setSelectedFileId(null);
          }
        },
        'danger'
      );
    } else {
      // Если onShowConfirm не передан, используем alert как fallback (но это не должно происходить)
      console.warn('onShowConfirm not provided, cannot show confirmation dialog');
    }
  };

  const handleGenerateResult = async (role: 'dsl' | 'verstka') => {
    if (!selectedFile || !documentCreatorAgent) return;

    // Ищем агента с нужной ролью (может быть отдельным агентом или частью копирайтера)
    const targetAgent = agents.find(agent => {
      return hasRole(agent.role, role === 'dsl' ? 'dsl' : 'verstka');
    });

    if (!targetAgent) {
      if (onShowAlert) {
        onShowAlert(`${role === 'dsl' ? 'DSL' : 'Верстка'} агент не найден`, 'Ошибка', 'error');
      } else {
        // Если onShowAlert не передан, логируем ошибку (но это не должно происходить)
        console.error(`${role === 'dsl' ? 'DSL' : 'Верстка'} агент не найден`);
      }
      return;
    }

    if (role === 'dsl') {
      setIsGeneratingDSL(true);
    } else {
      setIsGeneratingVerstka(true);
    }

    try {
      const { file } = await api.generateDocumentResult(
        documentCreatorAgent.id,
        selectedFile.id,
        role
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
        role,
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

      // Переключаемся на соответствующий таб после небольшой задержки
      // чтобы состояние успело обновиться
      setTimeout(() => {
        setActiveTab(role);
      }, 100);
    } catch (error: any) {
      console.error('Failed to generate result:', error);
      if (onShowAlert) {
        onShowAlert(`Не удалось сгенерировать результат: ${error?.message || 'Неизвестная ошибка'}`, 'Ошибка', 'error');
      } else {
        // Если onShowAlert не передан, логируем ошибку (но это не должно происходить)
        console.error(`Не удалось сгенерировать результат: ${error?.message || 'Неизвестная ошибка'}`);
      }
    } finally {
      setIsGeneratingDSL(false);
      setIsGeneratingVerstka(false);
    }
  };

  // Получаем контент для отображения в зависимости от активного таба
  const getDisplayContent = () => {
    // Используем localSelectedFile если он есть (может содержать обновленные данные), иначе selectedFile
    const fileToUse = localSelectedFile || selectedFile;
    if (!fileToUse) return null;

    if (activeTab === 'text') {
      return fileToUse.data;
    } else if (activeTab === 'dsl') {
      const content = fileToUse.dslContent || null;
      console.log('[ProjectDocumentsModal] getDisplayContent DSL:', {
        hasContent: !!content,
        contentLength: content?.length || 0,
        selectedFileId: fileToUse.id,
        isLocalSelected: localSelectedFile?.id === fileToUse.id,
      });
      return content;
    } else if (activeTab === 'verstka') {
      const content = fileToUse.verstkaContent || null;
      console.log('[ProjectDocumentsModal] getDisplayContent Verstka:', {
        hasContent: !!content,
        contentLength: content?.length || 0,
        selectedFileId: fileToUse.id,
        isLocalSelected: localSelectedFile?.id === fileToUse.id,
      });
      return content;
    } else if (activeTab === 'code') {
      // Для таба "Код" показываем verstkaContent (сгенерированный HTML код верстки)
      const codeContent = fileToUse.verstkaContent || null;
      console.log('[ProjectDocumentsModal] getDisplayContent Code:', {
        hasVerstkaContent: !!fileToUse.verstkaContent,
        codeContent: !!codeContent,
        verstkaContentLength: fileToUse.verstkaContent?.length || 0,
      });
      return codeContent;
    } else if (activeTab === 'preview') {
      // Для таба "Превью" показываем verstkaContent (HTML код верстки)
      const previewContent = fileToUse.verstkaContent || null;
      console.log('[ProjectDocumentsModal] getDisplayContent Preview:', {
        hasVerstkaContent: !!fileToUse.verstkaContent,
        previewContent: !!previewContent,
        verstkaContentLength: fileToUse.verstkaContent?.length || 0,
        fileId: fileToUse.id,
        isLocalSelected: !!localSelectedFile,
      });
      return previewContent;
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-black via-black to-indigo-950/20 flex flex-col md:flex-row overflow-hidden">
        
        {/* Sidebar List */}
        <div className={`w-full md:w-[27%] border-r border-white/10 flex flex-col bg-black/40 backdrop-blur-xl ${selectedFile ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-amber-500/20 rounded-xl text-amber-400">
                <FileText size={18} className="sm:w-5 sm:h-5" />
              </div>
              <span className="hidden sm:inline">Documents</span>
              <span className="sm:hidden">Документы</span>
            </h2>
            {/* Mobile Close Button */}
            <button 
              onClick={onClose} 
              className="md:hidden p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Закрыть"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
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
                  className={`w-full text-left p-4 rounded-2xl transition-all flex items-center gap-4 group relative overflow-hidden ${
                    selectedFileId === doc.id 
                      ? 'bg-white/10 shadow-lg border border-white/10' 
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {selectedFileId === doc.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400"></div>}
                  
                  <div className="min-w-0 flex-1">
                    <h4 className={`text-sm font-semibold line-clamp-2 ${selectedFileId === doc.id ? 'text-white' : 'text-white/70'}`}>
                      {getDocumentDisplayName(doc)}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">
                            {doc.type.includes('markdown') ? 'MD' : doc.type.split('/')[1]}
                        </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Preview Area */}
        <div className={`flex-1 flex flex-col bg-black/30 relative ${!selectedFile ? 'hidden md:flex' : 'flex'}`}>
          
          {/* Mobile Header for Preview */}
          <div className="md:hidden p-4 border-b border-white/10 flex items-center gap-3 bg-black/40 backdrop-blur-md">
            <button onClick={() => setSelectedFileId(null)} className="text-white/60 hover:text-white">
               ← Назад
            </button>
            <span className="font-medium truncate text-white">
              {selectedFile ? getDocumentDisplayName(selectedFile) : ''}
            </span>
            <button onClick={onClose} className="ml-auto p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
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
            <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 scrollbar-thin">
              <div className="max-w-6xl mx-auto w-full">
                 <div className="mb-8 pb-6 border-b border-white/10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold tracking-wider uppercase">
                            {selectedFile ? getAgentName(selectedFile) : 'Документ'}
                        </div>
                        {selectedFile && (
                            <span className="text-sm text-white/60">
                                {formatTime24h(selectedFile)}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center justify-between gap-6 text-sm text-white/40">
                        <div className="flex items-center gap-6">
                            <span className="flex items-center gap-1.5"><Calendar size={14} /> {new Date().toLocaleDateString()}</span>
                            
                            {/* Tabs for Verstka documents */}
                            {showVerstkaSubTabs && (
                              <div className="flex items-center gap-2 border-b border-white/10 -mb-[1px]">
                                <button
                                  onClick={() => setActiveTab('preview')}
                                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                                    activeTab === 'preview'
                                      ? 'text-cyan-400 border-cyan-400/40'
                                      : 'text-white/50 border-transparent hover:text-white/70'
                                  }`}
                                >
                                  Превью
                                </button>
                                <button
                                  onClick={() => setActiveTab('code')}
                                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                                    activeTab === 'code'
                                      ? 'text-cyan-400 border-cyan-400/40'
                                      : 'text-white/50 border-transparent hover:text-white/70'
                                  }`}
                                >
                                  Код
                                </button>
                              </div>
                            )}
                            
                            {showDSLButtons && (
                              <>
                                {dslAgent && (
                                  <div className="flex items-center gap-1.5">
                                    <button 
                                        onClick={(e) => {
                                          e.preventDefault();
                                          handleGenerateResult('dsl');
                                        }}
                                        disabled={isGeneratingDSL}
                                        className="text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                                    >
                                        {isGeneratingDSL && <Loader2 size={14} className="animate-spin" />}
                                        DSL
                                    </button>
                                  </div>
                                )}
                                {verstkaAgent && (
                                  <div className="flex items-center gap-1.5">
                                    <button 
                                        onClick={(e) => {
                                          e.preventDefault();
                                          handleGenerateResult('verstka');
                                        }}
                                        disabled={isGeneratingVerstka}
                                        className="text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                                    >
                                        {isGeneratingVerstka && <Loader2 size={14} className="animate-spin" />}
                                        Верстка
                                    </button>
                                  </div>
                                )}
                              </>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => handleDownload(selectedFile, e)}
                            className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                            title="Скачать"
                          >
                            <Download size={16} />
                          </button>
                          {onRemoveFile && (
                            <button 
                              onClick={(e) => handleDelete(selectedFile.id, e)}
                              className="p-1.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                              title="Удалить"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                    </div>
                 </div>

                 {/* Tabs for copywriter documents */}
                 {showDSLButtons && (
                   <div className="mb-6 flex items-center gap-2 border-b border-white/10">
                     <button
                       onClick={() => setActiveTab('text')}
                       className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                         activeTab === 'text'
                           ? 'text-white border-white/40'
                           : 'text-white/50 border-transparent hover:text-white/70'
                       }`}
                     >
                       Текст
                     </button>
                     <button
                       onClick={() => setActiveTab('dsl')}
                       className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                         activeTab === 'dsl'
                           ? 'text-purple-400 border-purple-400/40'
                           : 'text-white/50 border-transparent hover:text-white/70'
                       }`}
                     >
                       DSL
                     </button>
                     <button
                       onClick={() => setActiveTab('verstka')}
                       className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                         activeTab === 'verstka'
                           ? 'text-cyan-400 border-cyan-400/40'
                           : 'text-white/50 border-transparent hover:text-white/70'
                       }`}
                     >
                       Верстка
                     </button>
                   </div>
                 )}
                 
                 <div className={`bg-white/5 rounded-[2rem] border border-white/5 min-h-[50vh] shadow-inner overflow-x-auto ${activeTab === 'preview' ? 'p-0' : 'p-8'}`}>
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
                         
                         // Специальная обработка для табов верстальщика (Код и Превью)
                         if (activeTab === 'code' || activeTab === 'preview') {
                           const fileToUse = localSelectedFile || selectedFile;
                           
                           if (activeTab === 'code') {
                             // Таб "Код" - показываем HTML с подсветкой синтаксиса
                             if (content) {
                               const decodedHtml = decodeContent(content);
                               return (
                                 <div className="overflow-auto max-h-[70vh]">
                                   <SyntaxHighlighter
                                     style={vscDarkPlus}
                                     language="html"
                                     PreTag="div"
                                     customStyle={{
                                       margin: 0,
                                       borderRadius: '1rem',
                                       padding: '1.5rem',
                                     }}
                                   >
                                     {decodedHtml}
                                   </SyntaxHighlighter>
                                 </div>
                               );
                             } else {
                               // Если verstkaContent нет, показываем сообщение
                               return (
                                 <div className="flex flex-col items-center justify-center h-60 text-white/30 text-center">
                                   <p className="text-base font-medium mb-2">HTML код еще не сгенерирован</p>
                                   <p className="text-sm text-white/20">
                                     Код верстки будет отображен здесь после генерации
                                   </p>
                                 </div>
                               );
                             }
                           } else if (activeTab === 'preview') {
                             // Таб "Превью" - показываем HTML в iframe
                             // Используем content из getDisplayContent(), который уже проверил verstkaContent
                             if (content) {
                               const decodedHtml = decodeContent(content);
                               return (
                                 <div className="w-full h-[70vh] rounded-xl overflow-hidden border-0">
                                   <iframe
                                     srcDoc={decodedHtml}
                                     className="w-full h-full border-0"
                                     title="HTML Preview"
                                     sandbox="allow-same-origin allow-scripts"
                                   />
                                 </div>
                               );
                             } else {
                               // Если контента нет, показываем сообщение
                               return (
                                 <div className="flex flex-col items-center justify-center h-60 text-white/30 text-center">
                                   <p className="text-base font-medium mb-2">HTML верстка еще не сгенерирована</p>
                                   <p className="text-sm text-white/20">
                                     Результат верстки будет отображен здесь после генерации
                                   </p>
                                 </div>
                               );
                             }
                           }
                         }
                         
                         // Проверка на пустое состояние для других табов
                         if (content === null) {
                           // Пустое состояние для DSL или Верстка
                           const roleName = activeTab === 'dsl' ? 'DSL' : 'Верстка';
                           const isDSL = activeTab === 'dsl';
                           return (
                             <div className="flex flex-col items-center justify-center h-60 text-white/30 text-center">
                               <p className="text-base font-medium mb-2">Результат {roleName} еще не сгенерирован</p>
                               <p className="text-sm text-white/20">
                                 Используйте кнопку <span className={isDSL ? 'text-purple-400' : 'text-cyan-400'}>{roleName}</span> выше для генерации результата
                               </p>
                             </div>
                           );
                         }
                         
                         // Обычный рендер для других табов
                         return (
                           <div className="prose prose-invert prose-lg max-w-none overflow-x-auto break-words">
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
  );
};