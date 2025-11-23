import React, { useRef, useEffect, useState } from 'react';
import { X, Upload, FileText, Trash2, Save, Info, Edit3, FileCheck, Cpu, Zap, Brain, PenTool, Code2, Layout } from 'lucide-react';
import { Agent, MODELS, LLMModel } from '../types';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeAgent: Agent;
  onUpdateAgent: (updatedAgent: Agent) => void;
  onFileUpload: (files: FileList) => void;
  onRemoveFile: (id: string) => void;
  onApplyChanges: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  activeAgent,
  onUpdateAgent,
  onFileUpload,
  onRemoveFile,
  onApplyChanges
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Local state for editing
  const [name, setName] = useState(activeAgent.name);
  const [instruction, setInstruction] = useState(activeAgent.systemInstruction);
  const [summaryInst, setSummaryInst] = useState(activeAgent.summaryInstruction || "");
  const [role, setRole] = useState(activeAgent.role || "");
  
  // Get current role value for select (supports old format with comma-separated)
  const getCurrentRole = (): string => {
    if (!role) return '';
    const roles = role.split(',').map(r => r.trim());
    // Return first valid role from copywriter, dsl, verstka
    if (roles.includes('copywriter')) return 'copywriter';
    if (roles.includes('dsl')) return 'dsl';
    if (roles.includes('verstka')) return 'verstka';
    return '';
  };
  
  const resolveModel = (value: Agent['model']): LLMModel => {
    if (value === LLMModel.GPT51) return LLMModel.GPT51;
    if (value === LLMModel.GPT5_MINI) return LLMModel.GPT5_MINI;
    if (value === LLMModel.GPT4O) return LLMModel.GPT4O;
    if (value === LLMModel.GPT4O_MINI) return LLMModel.GPT4O_MINI;
    return LLMModel.GPT51;
  };

  const renderModelIcon = (modelId: LLMModel) => {
    if (modelId === LLMModel.GPT4O_MINI) {
      return <Zap size={14} className="text-amber-400" />;
    }
    if (modelId === LLMModel.GPT5_MINI) {
      return <Zap size={14} className="text-emerald-400" />;
    }
    if (modelId === LLMModel.GPT51) {
      return <Brain size={14} className="text-emerald-300" />;
    }
    return <Cpu size={14} className="text-pink-400" />;
  };

  // Render icon for role
  const renderRoleIcon = (roleName: string) => {
    if (roleName === 'copywriter') {
      return <PenTool size={14} className="text-indigo-400" />;
    }
    if (roleName === 'dsl') {
      return <Code2 size={14} className="text-purple-400" />;
    }
    if (roleName === 'verstka') {
      return <Layout size={14} className="text-cyan-400" />;
    }
    return null;
  };

  // Get role label
  const getRoleLabel = (roleName: string): string => {
    if (roleName === 'copywriter') return 'Копирайтер';
    if (roleName === 'dsl') return 'DSL';
    if (roleName === 'verstka') return 'Верстка';
    return 'Выключено';
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
      className={`fixed inset-y-2 right-2 w-full sm:w-[90%] md:w-[380px] bg-gradient-to-b from-black/80 via-black/70 to-black/80 backdrop-blur-2xl border border-white/10 rounded-[1.5rem] shadow-2xl shadow-indigo-500/10 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] z-[70] flex flex-col overflow-hidden max-h-[calc(100dvh-1rem)] will-change-transform ${
        isOpen ? 'translate-x-0' : 'translate-x-[120%]'
      }`}
    >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5 shrink-0">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500/20 rounded-lg">
              <Info size={16} className="text-indigo-300" />
            </div>
            Agent Config
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full bg-white/5 text-white/60 hover:bg-white/20 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
          
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
                 className={`w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 pl-10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:ring-offset-2 focus:ring-offset-black focus:border-indigo-500/50 transition-all shadow-inner ${
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
            <div className="relative">
              <select
                value={model}
                onChange={(e) => {
                  setModel(e.target.value as LLMModel);
                }}
                className="w-full appearance-none bg-black/30 border border-white/10 rounded-xl px-4 py-3 pl-10 pr-10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:ring-offset-2 focus:ring-offset-black focus:border-indigo-500/50 transition-all shadow-inner cursor-pointer hover:bg-black/40"
              >
                {MODELS.map((m) => (
                  <option key={m.id} value={m.id} className="bg-black text-white">
                    {m.name}
                  </option>
                ))}
              </select>
              {/* Model Icon */}
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                {renderModelIcon(model)}
              </div>
              {/* Dropdown Arrow */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {/* Selected model indicator */}
              <div className="absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none">
                <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_5px_rgba(129,140,248,1)]"></div>
              </div>
            </div>
            {/* Model Description */}
            <p className="text-[10px] text-white/40 leading-tight mt-2 pl-1">
              {MODELS.find(m => m.id === model)?.description}
            </p>
          </section>

          {/* Roles Section */}
          <section>
            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">
               Роль
            </label>
            <div className="relative">
              <select
                value={getCurrentRole()}
                onChange={(e) => {
                  setRole(e.target.value || '');
                }}
                className="w-full appearance-none bg-black/30 border border-white/10 rounded-xl px-4 py-3 pl-10 pr-10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:ring-offset-2 focus:ring-offset-black focus:border-indigo-500/50 transition-all shadow-inner cursor-pointer hover:bg-black/40"
              >
                <option value="">Выключено</option>
                <option value="copywriter">Копирайтер</option>
                <option value="dsl">DSL</option>
                <option value="verstka">Верстка</option>
              </select>
              {/* Role Icon */}
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                {getCurrentRole() ? (
                  renderRoleIcon(getCurrentRole())
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-white/20" />
                )}
              </div>
              {/* Dropdown Arrow */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {/* Selected role indicator */}
              {getCurrentRole() && (
                <div className="absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_5px_rgba(129,140,248,1)]"></div>
                </div>
              )}
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
                className="w-full h-32 bg-black/30 border border-white/10 rounded-xl p-3 text-xs text-white/90 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:ring-offset-2 focus:ring-offset-black focus:border-indigo-500/50 placeholder-white/20 resize-none transition-all shadow-inner leading-relaxed"
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
              className="w-full h-20 bg-black/20 border border-white/5 rounded-lg p-2 text-xs text-white/80 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:ring-offset-2 focus:ring-offset-black focus:border-indigo-500/50 placeholder-white/20 resize-none transition-all"
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

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-black/20 backdrop-blur-xl shrink-0">
          <button
            onClick={handleSave}
            className="w-full flex items-center justify-center gap-2 bg-white text-black hover:bg-indigo-50 py-3 px-4 rounded-xl font-bold text-sm transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)] active:scale-[0.98]"
          >
            <Save size={16} />
            Apply Changes
          </button>
        </div>
    </div>
  );
};