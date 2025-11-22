import React, { useState, useEffect } from 'react';
import { X, FileText, Download, Calendar, Eye, Trash2, Settings, Loader2 } from 'lucide-react';
import { UploadedFile, Agent } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { SettingsPanel } from './SettingsPanel';
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
  onAgentFilesUpdate
}) => {
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'text' | 'dsl' | 'verstka'>('text');
  const [isGeneratingDSL, setIsGeneratingDSL] = useState(false);
  const [isGeneratingVerstka, setIsGeneratingVerstka] = useState(false);
  const [localSelectedFile, setLocalSelectedFile] = useState<UploadedFile | null>(null);
  const [settingsAgentId, setSettingsAgentId] = useState<string | null>(null);

  // Сбрасываем таб при смене документа
  useEffect(() => {
    if (selectedFileId) {
      setActiveTab('text');
    }
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
  const showDSLButtons = documentCreatorAgent?.role === "copywriter";
  
  // Находим агентов DSL и Верстка по ролям
  const dslAgent = agents.find(agent => agent.role === 'dsl');
  const verstkaAgent = agents.find(agent => agent.role === 'verstka');

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
    if (!confirm('Удалить этот документ?')) return;
    
    onRemoveFile(fileId);
    
    // Если удаляемый файл был выбран, сбросить выбор
    if (selectedFileId === fileId) {
      setSelectedFileId(null);
    }
  };

  const handleGenerateResult = async (role: 'dsl' | 'verstka') => {
    if (!selectedFile || !documentCreatorAgent) return;

    const targetAgent = role === 'dsl' 
      ? agents.find(agent => agent.role === 'dsl')
      : agents.find(agent => agent.role === 'verstka');

    if (!targetAgent) {
      alert(`${role === 'dsl' ? 'DSL' : 'Верстка'} агент не найден`);
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
      alert(`Не удалось сгенерировать результат: ${error?.message || 'Неизвестная ошибка'}`);
    } finally {
      setIsGeneratingDSL(false);
      setIsGeneratingVerstka(false);
    }
  };

  // Получаем контент для отображения в зависимости от активного таба
  const getDisplayContent = () => {
    if (!selectedFile) return null;

    if (activeTab === 'text') {
      return selectedFile.data;
    } else if (activeTab === 'dsl') {
      const content = selectedFile.dslContent || null;
      console.log('[ProjectDocumentsModal] getDisplayContent DSL:', {
        hasContent: !!content,
        contentLength: content?.length || 0,
        selectedFileId: selectedFile.id,
        isLocalSelected: localSelectedFile?.id === selectedFile.id,
      });
      return content;
    } else if (activeTab === 'verstka') {
      const content = selectedFile.verstkaContent || null;
      console.log('[ProjectDocumentsModal] getDisplayContent Verstka:', {
        hasContent: !!content,
        contentLength: content?.length || 0,
        selectedFileId: selectedFile.id,
        isLocalSelected: localSelectedFile?.id === selectedFile.id,
      });
      return content;
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-6xl h-[85vh] bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        
        {/* Sidebar List */}
        <div className={`w-full md:w-[27%] border-r border-white/10 flex flex-col bg-white/5 ${selectedFile ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400">
                <FileText size={20} />
              </div>
              Documents
            </h2>
            <button onClick={onClose} className="md:hidden text-white/50">
              <X size={24} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
            {documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-60 text-white/30 text-center p-6 border-2 border-dashed border-white/5 rounded-3xl m-4">
                <FileText size={40} className="mb-4 opacity-50" />
                <p className="text-base font-medium">No documents yet.</p>
                <p className="text-xs mt-2 max-w-[200px]">Use the "Save" button in chat to create reports.</p>
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
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <div 
                      onClick={(e) => handleDownload(doc, e)}
                      className="p-2 text-white/30 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                      title="Download"
                    >
                      <Download size={18} />
                    </div>
                    {onRemoveFile && (
                      <div 
                        onClick={(e) => handleDelete(doc.id, e)}
                        className="p-2 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Preview Area */}
        <div className={`flex-1 flex flex-col bg-black/20 relative ${!selectedFile ? 'hidden md:flex' : 'flex'}`}>
          
          {/* Mobile Header for Preview */}
          <div className="md:hidden p-4 border-b border-white/10 flex items-center gap-3 bg-black/40 backdrop-blur-md">
            <button onClick={() => setSelectedFileId(null)} className="text-white/60 hover:text-white">
               ← Back
            </button>
            <span className="font-medium truncate text-white">
              {selectedFile ? getDocumentDisplayName(selectedFile) : ''}
            </span>
          </div>

          {/* Desktop Close Button */}
          <div className="absolute top-6 right-6 z-10 hidden md:flex gap-2">
             <button onClick={onClose} className="p-2.5 bg-black/40 backdrop-blur-md hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors border border-white/5">
                <X size={20} />
             </button>
          </div>

          {selectedFile ? (
            <div className="flex-1 overflow-y-auto p-8 md:p-12 scrollbar-thin">
              <div className="max-w-4xl mx-auto">
                 <div className="mb-8 pb-6 border-b border-white/10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold tracking-wider uppercase mb-4">
                        Project File
                    </div>
                   <h1 className="text-lg md:text-xl font-bold text-white mb-3 break-words leading-tight">
                      {getDocumentDisplayName(selectedFile)}
                   </h1>
                    <div className="flex items-center gap-6 text-sm text-white/40">
                        <span className="flex items-center gap-1.5"><Calendar size={14} /> {new Date().toLocaleDateString()}</span> 
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
                                <button 
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setSettingsAgentId(dslAgent.id);
                                    }}
                                    className="p-1 text-purple-400/60 hover:text-purple-300 hover:bg-purple-500/10 rounded transition-colors"
                                    title="Настройки агента DSL"
                                >
                                    <Settings size={14} />
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
                                <button 
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setSettingsAgentId(verstkaAgent.id);
                                    }}
                                    className="p-1 text-cyan-400/60 hover:text-cyan-300 hover:bg-cyan-500/10 rounded transition-colors"
                                    title="Настройки агента Верстка"
                                >
                                    <Settings size={14} />
                                </button>
                              </div>
                            )}
                          </>
                        )}
                    </div>
                 </div>

                 {/* Tabs */}
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
                 
                 <div className="bg-white/5 rounded-[2rem] border border-white/5 p-8 min-h-[50vh] shadow-inner">
                    {selectedFile && selectedFile.type.includes('image') && activeTab === 'text' ? (
                       <img src={`data:${selectedFile.type};base64,${selectedFile.data}`} alt="Preview" className="max-w-full h-auto rounded-2xl shadow-2xl" />
                    ) : (
                       (() => {
                         if (!selectedFile) {
                           return (
                             <div className="flex flex-col items-center justify-center h-60 text-white/30 text-center">
                               <p className="text-base font-medium">Выберите документ для просмотра</p>
                             </div>
                           );
                         }
                         const content = getDisplayContent();
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
                         return (
                           <div className="prose prose-invert prose-lg max-w-none">
                             <MarkdownRenderer content={decodeContent(content)} />
                           </div>
                         );
                       })()
                    )}
                 </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-white/20">
               <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/5">
                  <Eye size={48} className="opacity-50" />
               </div>
               <p className="text-lg font-medium">Select a document to view</p>
            </div>
          )}
        </div>

      </div>

      {/* Agent Settings Panel - открывается поверх модального окна */}
      {settingsAgentId && (() => {
        const settingsAgent = agents.find(a => a.id === settingsAgentId);
        if (!settingsAgent || !onUpdateAgent || !onRemoveAgentFile) return null;
        
        // Локальная функция для загрузки файлов с правильным agentId
        const handleFileUploadForAgent = async (fileList: FileList) => {
          if (!fileList.length) return;
          
          const uploads: UploadedFile[] = [];
          const errors: string[] = [];
          
          const allowedExtensions = ['.txt', '.md'];
          const allowedMimeTypes = ['text/plain', 'text/markdown'];
          
          for (let i = 0; i < fileList.length; i++) {
            const file = fileList[i];
            
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
              const { file: uploaded } = await api.uploadFile(settingsAgentId, {
                name: file.name,
                mimeType: file.type || 'text/plain',
                content: base64,
                isKnowledgeBase: true,
              });
              
              uploads.push({
                id: uploaded.id,
                name: uploaded.name,
                type: uploaded.mimeType,
                data: uploaded.content,
                agentId: uploaded.agentId,
                dslContent: uploaded.dslContent,
                verstkaContent: uploaded.verstkaContent,
              });
            } catch (error: any) {
              console.error('File upload failed', error);
              errors.push(`Не удалось загрузить ${file.name}: ${error?.message || 'Неизвестная ошибка'}`);
            }
          }
          
          if (errors.length > 0) {
            alert(`Ошибки при загрузке файлов:\n${errors.join('\n')}`);
          }
          
          if (uploads.length > 0) {
            // Обновляем файлы агента через callback
            if (onAgentFilesUpdate) {
              const updatedAgent = agents.find(a => a.id === settingsAgentId);
              if (updatedAgent) {
                onAgentFilesUpdate(settingsAgentId, [...updatedAgent.files, ...uploads]);
              }
            }
            alert(`Успешно загружено файлов в базу знаний: ${uploads.length}`);
          } else if (errors.length === 0) {
            alert('Не удалось загрузить файлы');
          }
        };
        
        return (
          <SettingsPanel
            isOpen={!!settingsAgentId}
            onClose={() => setSettingsAgentId(null)}
            activeAgent={settingsAgent}
            onUpdateAgent={onUpdateAgent}
            onFileUpload={handleFileUploadForAgent}
            onRemoveFile={onRemoveAgentFile}
            onApplyChanges={() => {}}
          />
        );
      })()}
    </div>
  );
};