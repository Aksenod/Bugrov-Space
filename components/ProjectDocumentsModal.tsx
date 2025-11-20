import React, { useState } from 'react';
import { X, FileText, Download, Calendar, Eye, Trash2, Settings } from 'lucide-react';
import { UploadedFile, Agent } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ProjectDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: UploadedFile[];
  onRemoveFile?: (fileId: string) => void;
  agentRole?: string;
  agents?: Agent[];
  onAgentClick?: (agentId: string) => void;
  onOpenAgentSettings?: (agentId: string) => void;
}

export const ProjectDocumentsModal: React.FC<ProjectDocumentsModalProps> = ({
  isOpen,
  onClose,
  documents,
  onRemoveFile,
  agentRole,
  agents = [],
  onAgentClick,
  onOpenAgentSettings
}) => {
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedFile = documents.find(doc => doc.id === selectedFileId);
  
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
                      {doc.name}
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
            <span className="font-medium truncate text-white">{selectedFile?.name}</span>
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
                    <h1 className="text-lg md:text-xl font-bold text-white mb-3 break-words leading-tight">{selectedFile.name}</h1>
                    <div className="flex items-center gap-6 text-sm text-white/40">
                        <span className="flex items-center gap-1.5"><Calendar size={14} /> {new Date().toLocaleDateString()}</span> 
                        {agentRole === "copywriter" && (
                          <>
                            {dslAgent && (
                              <div className="flex items-center gap-1.5">
                                <button 
                                    onClick={(e) => {
                                      e.preventDefault();
                                      if (onAgentClick) {
                                        onAgentClick(dslAgent.id);
                                      }
                                    }}
                                    className="text-purple-400 hover:text-purple-300 transition-colors"
                                >
                                    DSL
                                </button>
                                <button 
                                    onClick={(e) => {
                                      e.preventDefault();
                                      if (onOpenAgentSettings) {
                                        onOpenAgentSettings(dslAgent.id);
                                      }
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
                                      if (onAgentClick) {
                                        onAgentClick(verstkaAgent.id);
                                      }
                                    }}
                                    className="text-cyan-400 hover:text-cyan-300 transition-colors"
                                >
                                    Верстка
                                </button>
                                <button 
                                    onClick={(e) => {
                                      e.preventDefault();
                                      if (onOpenAgentSettings) {
                                        onOpenAgentSettings(verstkaAgent.id);
                                      }
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
                 
                 <div className="bg-white/5 rounded-[2rem] border border-white/5 p-8 min-h-[50vh] shadow-inner">
                    {selectedFile.type.includes('image') ? (
                       <img src={`data:${selectedFile.type};base64,${selectedFile.data}`} alt="Preview" className="max-w-full h-auto rounded-2xl shadow-2xl" />
                    ) : (
                       <div className="prose prose-invert prose-lg max-w-none">
                          <MarkdownRenderer content={decodeContent(selectedFile.data)} />
                       </div>
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
    </div>
  );
};