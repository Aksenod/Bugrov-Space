import React, { useRef, useEffect, useState } from 'react';
import { X, Upload, FileText, Trash2, Save, Info, Edit3, FileCheck, Cpu, Zap, Brain, Plus, Settings as SettingsIcon, PenTool, Code2, Layout } from 'lucide-react';
import { Agent, MODELS, LLMModel, User } from '../types';
import { api, ApiProjectType, ApiProjectTypeAgent } from '../services/api';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeAgent: Agent;
  onUpdateAgent: (updatedAgent: Agent) => void;
  onFileUpload: (files: FileList) => void;
  onRemoveFile: (id: string) => void;
  onApplyChanges: () => void;
  currentUser: User | null;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  activeAgent,
  onUpdateAgent,
  onFileUpload,
  onRemoveFile,
  onApplyChanges,
  currentUser
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Проверка, является ли пользователь администратором
  const isAdmin = currentUser && (currentUser.username === 'admin' || currentUser.role === 'admin');
  
  // Состояние для табов
  const [activeTab, setActiveTab] = useState<'agent' | 'projectTypes'>('agent');
  
  // Состояние для управления агентами типов проектов
  const [projectTypes, setProjectTypes] = useState<ApiProjectType[]>([]);
  const [selectedProjectTypeId, setSelectedProjectTypeId] = useState<string | null>(null);
  const [projectTypeAgents, setProjectTypeAgents] = useState<ApiProjectTypeAgent[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [isCreatingAgent, setIsCreatingAgent] = useState(false);
  
  // Local state for editing
  const [name, setName] = useState(activeAgent.name);
  const [instruction, setInstruction] = useState(activeAgent.systemInstruction);
  const [summaryInst, setSummaryInst] = useState(activeAgent.summaryInstruction || "");
  const [role, setRole] = useState(activeAgent.role || "");
  
  // Ленивая загрузка файлов агента (база знаний) при открытии панели
  // Это оптимизация - файлы не загружаются при загрузке списка агентов
  useEffect(() => {
    if (isOpen && activeAgent.id && activeAgent.files.length === 0) {
      // Загружаем файлы только если их еще нет
      api.getAgentFiles(activeAgent.id)
        .then(({ files }) => {
          // Обновляем агента с загруженными файлами
          onUpdateAgent({
            ...activeAgent,
            files: files.map(file => ({
              id: file.id,
              name: file.name,
              type: file.mimeType,
              data: file.content,
              agentId: file.agentId,
            })),
          });
        })
        .catch(error => {
          console.error('Failed to load agent files', error);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeAgent.id]);
  
  // Загружаем типы проектов при открытии панели (только для админов)
  useEffect(() => {
    if (isOpen && isAdmin && activeTab === 'projectTypes') {
      loadProjectTypes();
    }
  }, [isOpen, isAdmin, activeTab]);
  
  // Загружаем агентов выбранного типа проекта
  useEffect(() => {
    if (selectedProjectTypeId) {
      loadProjectTypeAgents(selectedProjectTypeId);
    } else {
      setProjectTypeAgents([]);
    }
  }, [selectedProjectTypeId]);
  
  const loadProjectTypes = async () => {
    setIsLoadingTypes(true);
    try {
      const { projectTypes: types } = await api.getProjectTypes();
      setProjectTypes(types);
      if (types.length > 0 && !selectedProjectTypeId) {
        setSelectedProjectTypeId(types[0].id);
      }
    } catch (error) {
      console.error('Failed to load project types', error);
    } finally {
      setIsLoadingTypes(false);
    }
  };
  
  const loadProjectTypeAgents = async (projectTypeId: string) => {
    setIsLoadingAgents(true);
    try {
      const { agents } = await api.getProjectTypeAgents(projectTypeId);
      setProjectTypeAgents(agents);
    } catch (error) {
      console.error('Failed to load project type agents', error);
    } finally {
      setIsLoadingAgents(false);
    }
  };
  
  const handleCreateProjectTypeAgent = async () => {
    if (!selectedProjectTypeId) return;
    
    setIsCreatingAgent(true);
    try {
      await api.createProjectTypeAgent(selectedProjectTypeId, {
        name: 'Новый агент',
        description: '',
        systemInstruction: '',
        summaryInstruction: '',
        model: 'gpt-5.1',
        role: '',
      });
      
      await loadProjectTypeAgents(selectedProjectTypeId);
    } catch (error) {
      console.error('Failed to create project type agent', error);
    } finally {
      setIsCreatingAgent(false);
    }
  };
  
  const handleDeleteProjectTypeAgent = async (agentId: string) => {
    if (!selectedProjectTypeId) return;
    
    if (!confirm('Удалить этого агента?')) return;
    
    try {
      await api.deleteProjectTypeAgent(selectedProjectTypeId, agentId);
      await loadProjectTypeAgents(selectedProjectTypeId);
    } catch (error) {
      console.error('Failed to delete project type agent', error);
    }
  };
  const resolveModel = (value: Agent['model']): LLMModel => {
    if (value === LLMModel.GPT51) return LLMModel.GPT51;
    if (value === LLMModel.GPT4O) return LLMModel.GPT4O;
    if (value === LLMModel.GPT4O_MINI) return LLMModel.GPT4O_MINI;
    return LLMModel.GPT51;
  };

  const renderModelIcon = (modelId: LLMModel) => {
    if (modelId === LLMModel.GPT4O_MINI) {
      return <Zap size={14} className="text-amber-400" />;
    }
    if (modelId === LLMModel.GPT51) {
      return <Brain size={14} className="text-emerald-300" />;
    }
    return <Cpu size={14} className="text-pink-400" />;
  };

  const [model, setModel] = useState<LLMModel>(resolveModel(activeAgent.model));

  // Sync local state when active agent changes
  useEffect(() => {
    setName(activeAgent.name);
    setInstruction(activeAgent.systemInstruction);
    setSummaryInst(activeAgent.summaryInstruction || "");
    setModel(resolveModel(activeAgent.model));
    setRole(activeAgent.role || "");
  }, [activeAgent]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileUpload(e.dataTransfer.files);
    }
  };

  const handleSave = () => {
    onUpdateAgent({
      ...activeAgent,
      name: name,
      systemInstruction: instruction,
      summaryInstruction: summaryInst,
      model: model,
      role: role
    });
    onApplyChanges();
    onClose();
  };

  return (
    <div 
      className={`fixed inset-y-2 right-2 w-full md:w-[380px] bg-black/70 backdrop-blur-2xl border border-white/10 rounded-[1.5rem] shadow-2xl transform transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] z-[70] flex flex-col overflow-hidden max-h-[calc(100dvh-1rem)] ${
        isOpen ? 'translate-x-0' : 'translate-x-[120%]'
      }`}
    >
        {/* Header */}
        <div className="p-4 border-b border-white/10 bg-white/5 shrink-0">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                <SettingsIcon size={16} className="text-indigo-300" />
              </div>
              Settings
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-full bg-white/5 text-white/60 hover:bg-white/20 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('agent')}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'agent'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
              }`}
            >
              Agent Config
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('projectTypes')}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'projectTypes'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
                }`}
              >
                Type Agents
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
          {activeTab === 'agent' ? (
            <>
              {/* Agent Name Section */}
          <section>
             <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">
               Identity
             </label>
             <div className="relative group">
               <input 
                 type="text"
                 value={name}
                 onChange={(e) => setName(e.target.value)}
                 disabled={activeAgent.role && activeAgent.role.trim() !== ''}
                 className={`w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 pl-10 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all shadow-inner ${
                   activeAgent.role && activeAgent.role.trim() !== '' ? 'opacity-60 cursor-not-allowed' : ''
                 }`}
               />
               <Edit3 size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
                 activeAgent.role && activeAgent.role.trim() !== '' ? 'text-white/20' : 'text-white/30 group-focus-within:text-indigo-400'
               }`} />
             </div>
          </section>

          {/* Model Selection Section */}
          <section>
            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">
               Model Intelligence
             </label>
             <div className="grid grid-cols-1 gap-2">
               {MODELS.map((m) => (
                 <button
                   key={m.id}
                   onClick={() => setModel(m.id)}
                   className={`relative p-3 rounded-xl border text-left transition-all ${
                     model === m.id 
                       ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)]' 
                       : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                   }`}
                 >
                   <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {renderModelIcon(m.id as LLMModel)}
                        <span className={`text-xs font-bold ${model === m.id ? 'text-white' : 'text-white/70'}`}>
                          {m.name}
                        </span>
                      </div>
                      {model === m.id && <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_5px_rgba(129,140,248,1)]"></div>}
                   </div>
                   <p className="text-[10px] text-white/40 leading-tight pl-6">
                     {m.description}
                   </p>
                 </button>
               ))}
             </div>
          </section>

          {/* Roles Section */}
          <section>
            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">
               Роли
            </label>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-xl border border-white/10 bg-black/30 hover:bg-white/5 transition-all">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-white">Копирайтер</span>
                </div>
                <button
                  onClick={() => setRole(role === "copywriter" ? "" : "copywriter")}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                    role === "copywriter" ? "bg-indigo-500" : "bg-white/20"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${
                      role === "copywriter" ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* System Prompt Section */}
          <section>
            <div className="flex items-center justify-between mb-2">
               <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest">
                 Core Instructions
               </label>
            </div>
            <div className="relative">
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                className="w-full h-32 bg-black/30 border border-white/10 rounded-xl p-3 text-xs text-white/90 focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent placeholder-white/20 resize-none transition-all shadow-inner leading-relaxed"
                placeholder="Define agent behavior..."
              />
            </div>
          </section>

          {/* Summary Instruction Section */}
          <section className="bg-gradient-to-br from-indigo-900/20 to-purple-900/10 p-4 rounded-xl border border-indigo-500/20">
            <div className="flex items-center gap-2 mb-2 text-indigo-300">
               <FileCheck size={14} />
               <label className="block text-[10px] font-bold uppercase tracking-widest">
                 Summary Protocol
               </label>
            </div>
            <textarea
              value={summaryInst}
              onChange={(e) => setSummaryInst(e.target.value)}
              className="w-full h-20 bg-black/20 border border-white/5 rounded-lg p-2 text-xs text-white/80 focus:ring-1 focus:ring-indigo-500/50 focus:border-transparent placeholder-white/20 resize-none transition-all"
              placeholder="Instructions for saving results..."
            />
          </section>

          {/* Document Base Section */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest">
                Knowledge Base
              </label>
              <span className="px-1.5 py-0.5 bg-white/10 rounded-full text-[9px] text-white/60">{activeAgent.files.filter(file => !file.name.startsWith('Summary')).length} files</span>
            </div>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border border-dashed border-white/20 hover:border-indigo-400/50 hover:bg-indigo-500/5 bg-white/5 rounded-xl p-6 text-center cursor-pointer transition-all group mb-3"
            >
              <Upload className="mx-auto h-6 w-6 text-white/30 group-hover:text-indigo-400 mb-1.5 transition-colors duration-300" />
              <p className="text-xs text-white/60 group-hover:text-white transition-colors">
                Drop files here
              </p>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden" 
                multiple
                accept=".txt,.md"
              />
            </div>

            {/* File List */}
            {(() => {
              const knowledgeBaseFiles = activeAgent.files.filter(file => !file.name.startsWith('Summary'));
              return knowledgeBaseFiles.length > 0 && (
                <div className="space-y-1.5">
                  {knowledgeBaseFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-2.5 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="bg-indigo-500/20 p-1.5 rounded text-indigo-300">
                          <FileText size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-white truncate">{file.name}</p>
                          <p className="text-[9px] text-white/40 uppercase tracking-wider">{file.type.split('/')[1] || 'FILE'}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => onRemoveFile(file.id)}
                        className="p-1.5 text-white/30 hover:text-red-400 transition-colors rounded hover:bg-red-500/10"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              );
            })()}
          </section>
            </>
          ) : (
            /* Project Type Agents Management */
            <div className="space-y-4">
              <section>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">
                  Тип проекта
                </label>
                {isLoadingTypes ? (
                  <div className="text-white/40 text-xs">Загрузка...</div>
                ) : (
                  <select
                    value={selectedProjectTypeId || ''}
                    onChange={(e) => setSelectedProjectTypeId(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:ring-offset-2 focus:ring-offset-black focus:border-indigo-500/50 transition-all shadow-inner cursor-pointer hover:bg-black/40"
                  >
                    {projectTypes.map((type) => (
                      <option key={type.id} value={type.id} className="bg-black text-white">
                        {type.name}
                      </option>
                    ))}
                  </select>
                )}
              </section>
              
              {selectedProjectTypeId && (
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest">
                      Агенты типа проекта
                    </label>
                    <button
                      onClick={handleCreateProjectTypeAgent}
                      disabled={isCreatingAgent}
                      className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-all disabled:opacity-50"
                      title="Добавить агента"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  
                  {isLoadingAgents ? (
                    <div className="text-white/40 text-xs">Загрузка агентов...</div>
                  ) : projectTypeAgents.length === 0 ? (
                    <div className="text-white/40 text-xs text-center py-4">
                      Нет агентов для этого типа проекта
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {projectTypeAgents.map((agent) => (
                        <div
                          key={agent.id}
                          className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-white truncate">{agent.name}</div>
                            {agent.description && (
                              <div className="text-xs text-white/60 truncate mt-1">{agent.description}</div>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteProjectTypeAgent(agent.id)}
                            className="p-1.5 text-white/30 hover:text-red-400 transition-colors rounded hover:bg-red-500/10 ml-2"
                            title="Удалить"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {activeTab === 'agent' && (
          <div className="p-4 border-t border-white/10 bg-black/20 backdrop-blur-xl shrink-0">
            <button
              onClick={handleSave}
              className="w-full flex items-center justify-center gap-2 bg-white text-black hover:bg-indigo-50 py-3 px-4 rounded-xl font-bold text-sm transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)] active:scale-[0.98]"
            >
              <Save size={16} />
              Apply Changes
            </button>
          </div>
        )}
      </div>
  );
};