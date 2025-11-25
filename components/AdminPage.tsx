import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Edit2, Trash2, Loader2, Bot, Brain, Cpu, Zap, Edit3, FileCheck, Upload, FileText } from 'lucide-react';
import { api, ApiProjectType, ApiProjectTypeAgent, ApiFile } from '../services/api';
import { LLMModel, MODELS, UploadedFile } from '../types';
import { AlertDialog } from './AlertDialog';
import { ConfirmDialog } from './ConfirmDialog';

interface AdminPageProps {
  onClose: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'projectTypes' | 'agents'>('projectTypes');
  
  // Project Types state
  const [projectTypes, setProjectTypes] = useState<ApiProjectType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Agents state
  const [agents, setAgents] = useState<ApiProjectTypeAgent[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [isAgentDialogOpen, setIsAgentDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<ApiProjectTypeAgent | null>(null);
  
  // Agent form state
  const [agentName, setAgentName] = useState('');
  const [agentDescription, setAgentDescription] = useState('');
  const [agentSystemInstruction, setAgentSystemInstruction] = useState('');
  const [agentSummaryInstruction, setAgentSummaryInstruction] = useState('');
  const [agentModel, setAgentModel] = useState<LLMModel>(LLMModel.GPT51);
  const [agentRole, setAgentRole] = useState('');
  const [selectedProjectTypeIds, setSelectedProjectTypeIds] = useState<string[]>([]);
  const [isSavingAgent, setIsSavingAgent] = useState(false);
  const [isProjectTypesDropdownOpen, setIsProjectTypesDropdownOpen] = useState(false);
  const [agentFiles, setAgentFiles] = useState<UploadedFile[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const STORAGE_KEY = 'admin_agent_draft';

  // Dialog states
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [alertDialog, setAlertDialog] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    variant?: 'success' | 'error' | 'info' | 'warning';
  }>({
    isOpen: false,
    message: '',
  });

  useEffect(() => {
    loadProjectTypes();
  }, []);

  // Helper functions for dialogs
  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    variant: 'danger' | 'warning' | 'info' = 'danger'
  ) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
      variant,
    });
  };

  const showAlert = (
    message: string,
    title?: string,
    variant: 'success' | 'error' | 'info' | 'warning' = 'info',
    duration: number = 0
  ) => {
    setAlertDialog({
      isOpen: true,
      message,
      title,
      variant,
    });
    if (duration > 0) {
      setTimeout(() => {
        setAlertDialog(prev => ({ ...prev, isOpen: false }));
      }, duration);
    }
  };

  useEffect(() => {
    if (activeTab === 'agents') {
      loadAgents();
    }
  }, [activeTab]);

  const loadProjectTypes = async () => {
    setIsLoading(true);
    try {
      const { projectTypes: types } = await api.getProjectTypes();
      setProjectTypes(types);
    } catch (error) {
      console.error('Failed to load project types', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAgents = async () => {
    setIsLoadingAgents(true);
    try {
      const { agents: agentsList } = await api.getAllAgents();
      setAgents(agentsList);
    } catch (error: any) {
      console.error('Failed to load agents', error);
      // Не показываем ошибку пользователю, если это 404 (возможно, эндпоинт еще не развернут)
      if (error?.status !== 404) {
        showAlert('Не удалось загрузить список агентов', 'Ошибка', 'error');
      }
    } finally {
      setIsLoadingAgents(false);
    }
  };

  const handleCreate = async () => {
    if (!newTypeName.trim()) return;
    setIsCreating(true);
    try {
      await api.createProjectType(newTypeName.trim());
      setNewTypeName('');
      await loadProjectTypes();
    } catch (error) {
      console.error('Failed to create project type', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartEdit = (type: ApiProjectType) => {
    setEditingId(type.id);
    setEditingName(type.name);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) return;
    try {
      await api.updateProjectType(id, editingName.trim());
      setEditingId(null);
      setEditingName('');
      await loadProjectTypes();
    } catch (error) {
      console.error('Failed to update project type', error);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    showConfirm(
      'Удалить тип проекта?',
      `Удалить тип проекта "${name}"?`,
      async () => {
        try {
          await api.deleteProjectType(id);
          await loadProjectTypes();
        } catch (error: any) {
          showAlert(error?.message || 'Не удалось удалить тип проекта', 'Ошибка', 'error');
        }
      },
      'danger'
    );
  };

  const handleOpenAgentDialog = async (agent?: ApiProjectTypeAgent) => {
    if (agent) {
      setEditingAgent(agent);
      setAgentName(agent.name);
      setAgentDescription(agent.description || '');
      setAgentSystemInstruction(agent.systemInstruction || '');
      setAgentSummaryInstruction(agent.summaryInstruction || '');
      setAgentModel(resolveModel(agent.model));
      setAgentRole(agent.role || '');
      setSelectedProjectTypeIds(agent.projectTypes?.map(pt => pt.id) || []);
      // Загружаем файлы агента
      try {
        const { files } = await api.getAgentFiles(agent.id);
        setAgentFiles(files.map(file => ({
          id: file.id,
          name: file.name,
          type: file.mimeType,
          data: file.content,
          agentId: file.agentId,
        })));
      } catch (error) {
        console.error('Failed to load agent files', error);
        setAgentFiles([]);
      }
      // Очищаем черновик при редактировании существующего агента
      localStorage.removeItem(STORAGE_KEY);
    } else {
      // Создаем нового агента сразу
      try {
        const { agent: newAgent } = await api.createAgentTemplate({
          name: 'Новый агент',
          description: '',
          systemInstruction: '',
          summaryInstruction: '',
          model: LLMModel.GPT51,
        });
        setEditingAgent(newAgent);
        setAgentName(newAgent.name);
        setAgentDescription(newAgent.description || '');
        setAgentSystemInstruction(newAgent.systemInstruction || '');
        setAgentSummaryInstruction(newAgent.summaryInstruction || '');
        setAgentModel(resolveModel(newAgent.model));
        setAgentRole(newAgent.role || '');
        setSelectedProjectTypeIds([]);
        setAgentFiles([]);
        // Загружаем список агентов, чтобы новый агент появился в списке
        await loadAgents();
      } catch (error: any) {
        console.error('Failed to create agent', error);
        const errorMessage = error?.status === 404 
          ? 'Эндпоинт для создания агентов не найден. Убедитесь, что сервер перезапущен.'
          : error?.message || 'Не удалось создать агента';
        showAlert(errorMessage, 'Ошибка', 'error');
        return;
      }
    }
    setIsProjectTypesDropdownOpen(false);
    setIsAgentDialogOpen(true);
  };

  const handleCloseAgentDialog = () => {
    // Очищаем черновик при закрытии
    localStorage.removeItem(STORAGE_KEY);
    setIsAgentDialogOpen(false);
    setEditingAgent(null);
    setIsProjectTypesDropdownOpen(false);
    setAgentFiles([]);
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  };

  // Автосохранение в localStorage
  const saveDraftToStorage = () => {
    if (!editingAgent) return;
    
    const draft = {
      agentId: editingAgent.id,
      name: agentName,
      description: agentDescription,
      systemInstruction: agentSystemInstruction,
      summaryInstruction: agentSummaryInstruction,
      model: agentModel,
      role: agentRole,
      selectedProjectTypeIds,
    };
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch (error) {
      console.error('Failed to save draft to localStorage', error);
    }
  };

  // Восстановление из localStorage
  const loadDraftFromStorage = () => {
    try {
      const draftStr = localStorage.getItem(STORAGE_KEY);
      if (!draftStr) return false;
      
      const draft = JSON.parse(draftStr);
      if (draft.agentId && editingAgent && draft.agentId === editingAgent.id) {
        setAgentName(draft.name || '');
        setAgentDescription(draft.description || '');
        setAgentSystemInstruction(draft.systemInstruction || '');
        setAgentSummaryInstruction(draft.summaryInstruction || '');
        setAgentModel(draft.model || LLMModel.GPT51);
        setAgentRole(draft.role || '');
        setSelectedProjectTypeIds(draft.selectedProjectTypeIds || []);
        return true;
      }
    } catch (error) {
      console.error('Failed to load draft from localStorage', error);
    }
    return false;
  };

  // Автосохранение в API с debounce
  const autoSaveAgent = async () => {
    if (!editingAgent || !agentName.trim()) return;
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await api.updateAgentTemplate(editingAgent.id, {
          name: agentName.trim(),
          description: agentDescription.trim(),
          systemInstruction: agentSystemInstruction.trim(),
          summaryInstruction: agentSummaryInstruction.trim(),
          model: agentModel,
          role: agentRole.trim() || undefined,
        });
        // Обновляем привязки к типам проектов (даже если массив пустой, чтобы очистить старые связи)
        try {
          await api.attachAgentToProjectTypes(editingAgent.id, selectedProjectTypeIds);
        } catch (error: any) {
          // Если ошибка при привязке типов проектов - логируем, но не блокируем сохранение
          console.warn('Failed to attach project types', error);
        }
        // Обновляем список агентов
        await loadAgents();
      } catch (error: any) {
        console.error('Auto-save failed', error);
        // Не показываем ошибку пользователю при автосохранении, только логируем
        // Если это критическая ошибка (не 404), можно показать предупреждение
        if (error?.status && error.status !== 404 && error.status !== 401) {
          console.warn('Auto-save failed with non-404 error:', error);
        }
      }
    }, 1000); // Сохраняем через 1 секунду после последнего изменения
  };

  // Сохраняем в localStorage при изменении полей
  useEffect(() => {
    if (editingAgent) {
      saveDraftToStorage();
      autoSaveAgent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentName, agentDescription, agentSystemInstruction, agentSummaryInstruction, agentModel, agentRole, selectedProjectTypeIds, editingAgent?.id]);

  // Восстанавливаем из localStorage при открытии диалога
  useEffect(() => {
    if (isAgentDialogOpen && editingAgent) {
      loadDraftFromStorage();
    }
  }, [isAgentDialogOpen]);

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

  const handleFileUpload = async (fileList: FileList) => {
    if (!editingAgent || !fileList.length) {
      if (!editingAgent) {
        showAlert('Сначала создайте агента', 'Ошибка', 'error');
      }
      return;
    }
    
    setIsUploadingFiles(true);
    const uploads: UploadedFile[] = [];
    const errors: string[] = [];

    const allowedExtensions = ['.txt', '.md'];
    const allowedMimeTypes = ['text/plain', 'text/markdown'];
    const FILE_SIZE_LIMIT = 2 * 1024 * 1024;

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
        const { file: uploaded } = await api.uploadFile(editingAgent.id, {
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
        });
      } catch (error: any) {
        console.error('File upload failed', error);
        errors.push(`Не удалось загрузить ${file.name}: ${error?.message || 'Неизвестная ошибка'}`);
      }
    }

    if (errors.length > 0) {
      showAlert(`Ошибки при загрузке файлов:\n${errors.join('\n')}`, 'Ошибка', 'error');
    }

    if (uploads.length > 0) {
      setAgentFiles(prev => [...prev, ...uploads]);
      showAlert(`Успешно загружено файлов: ${uploads.length}`, 'Успех', 'success', 3000);
    }
    
    setIsUploadingFiles(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFile = async (fileId: string) => {
    if (!editingAgent) return;
    
    showConfirm(
      'Удалить файл из базы знаний?',
      'Файл будет удален из базы знаний.\n\nЭто действие нельзя отменить.',
      async () => {
        try {
          await api.deleteFile(editingAgent.id, fileId);
          setAgentFiles(prev => prev.filter(file => file.id !== fileId));
          showAlert('Файл успешно удален', undefined, 'success', 3000);
        } catch (error: any) {
          console.error('Failed to remove file', error);
          showAlert(`Не удалось удалить файл: ${error?.message || 'Неизвестная ошибка'}`, 'Ошибка', 'error');
        }
      },
      'danger'
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files);
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
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleSaveAgent = async () => {
    if (!editingAgent || !agentName.trim()) return;
    
    // Очищаем таймер автосохранения
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    
    setIsSavingAgent(true);
    try {
      // Обновление агента
      await api.updateAgentTemplate(editingAgent.id, {
        name: agentName.trim(),
        description: agentDescription.trim(),
        systemInstruction: agentSystemInstruction.trim(),
        summaryInstruction: agentSummaryInstruction.trim(),
        model: agentModel,
        role: agentRole.trim() || undefined,
      });
      // Обновляем привязки к типам проектов (даже если массив пустой, чтобы очистить старые связи)
      await api.attachAgentToProjectTypes(editingAgent.id, selectedProjectTypeIds);
      await loadAgents();
      // Очищаем черновик после успешного сохранения
      localStorage.removeItem(STORAGE_KEY);
      handleCloseAgentDialog();
    } catch (error: any) {
      console.error('Failed to save agent', error);
      showAlert(error?.message || 'Не удалось сохранить агента', 'Ошибка', 'error');
    } finally {
      setIsSavingAgent(false);
    }
  };

  const handleDeleteAgent = async (id: string, name: string) => {
    showConfirm(
      `Удалить агента "${name}"?`,
      'Агент и все связанные данные будут безвозвратно удалены.\n\nЭто действие нельзя отменить.',
      async () => {
        try {
          await api.deleteAgentTemplate(id);
          await loadAgents();
          showAlert('Агент успешно удален', undefined, 'success', 3000);
        } catch (error: any) {
          showAlert(error?.message || 'Не удалось удалить агента', 'Ошибка', 'error');
        }
      },
      'danger'
    );
  };

  const resolveModel = (value: string): LLMModel => {
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

  const toggleProjectType = (projectTypeId: string) => {
    setSelectedProjectTypeIds(prev => 
      prev.includes(projectTypeId)
        ? prev.filter(id => id !== projectTypeId)
        : [...prev, projectTypeId]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-black to-indigo-950/20">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-white">Админ-панель</h1>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/20 hover:text-white transition-colors flex items-center gap-2"
            >
              <X size={20} />
              Назад
            </button>
          </div>
            
            {/* Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('projectTypes')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'projectTypes'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
                }`}
              >
                Типы проектов
              </button>
              <button
                onClick={() => setActiveTab('agents')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'agents'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
                }`}
              >
                Агенты
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-4">
            {activeTab === 'projectTypes' ? (
              <>
                {/* Create Form */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
                    placeholder="Название типа проекта"
                    className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-transparent"
                  />
                  <button
                    onClick={handleCreate}
                    disabled={isCreating || !newTypeName.trim()}
                    className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    Создать
                  </button>
                </div>

                {/* List */}
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={24} className="animate-spin text-indigo-400" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {projectTypes.map((type) => (
                      <div
                        key={type.id}
                        className="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                      >
                        {editingId === type.id ? (
                          <>
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit(type.id)}
                              className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEdit(type.id)}
                              className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-semibold transition-colors"
                            >
                              Сохранить
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(null);
                                setEditingName('');
                              }}
                              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors"
                            >
                              Отмена
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-white font-medium">{type.name}</span>
                            <button
                              onClick={() => handleStartEdit(type)}
                              className="p-2 rounded-lg text-white/60 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                              title="Редактировать"
                            >
                              <Edit2 size={16} />
                            </button>
                            {type.id !== 'default' && (
                              <button
                                onClick={() => handleDelete(type.id, type.name)}
                                className="p-2 rounded-lg text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                title="Удалить"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Agents Tab */}
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-white">Агенты-шаблоны</h2>
                  <button
                    onClick={() => handleOpenAgentDialog()}
                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Создать агента
                  </button>
                </div>

                {isLoadingAgents ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={24} className="animate-spin text-indigo-400" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {agents.length === 0 ? (
                      <div className="text-center py-8 text-white/60">
                        Нет агентов. Создайте первого агента.
                      </div>
                    ) : (
                      agents.map((agent) => (
                        <div
                          key={agent.id}
                          className="p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <Bot size={18} className="text-indigo-400" />
                                <h3 className="text-white font-semibold">{agent.name}</h3>
                              </div>
                              {agent.description && (
                                <p className="text-sm text-white/60 mb-2">{agent.description}</p>
                              )}
                              {agent.projectTypes && agent.projectTypes.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {agent.projectTypes.map((pt) => (
                                    <span
                                      key={pt.id}
                                      className="px-2 py-1 bg-indigo-500/20 text-indigo-300 text-xs rounded-full border border-indigo-500/30"
                                    >
                                      {pt.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenAgentDialog(agent)}
                                className="p-2 rounded-lg text-white/60 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                                title="Редактировать"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDeleteAgent(agent.id, agent.name)}
                                className="p-2 rounded-lg text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                title="Удалить"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      {/* Agent Dialog */}
      {isAgentDialogOpen && (
        <div 
          className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsProjectTypesDropdownOpen(false);
            }
          }}
        >
          <div className="w-full max-w-2xl bg-gradient-to-b from-black/90 via-black/80 to-black/90 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Dialog Header */}
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5 shrink-0">
              <h2 className="text-xl font-bold text-white">
                {editingAgent ? 'Редактировать агента' : 'Создать агента'}
              </h2>
              <button
                onClick={handleCloseAgentDialog}
                className="p-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/20 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Dialog Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Agent Name */}
              <section>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">
                  Имя агента
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 pl-10 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all shadow-inner"
                    placeholder="Название агента"
                  />
                  <Edit3 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-indigo-400 transition-colors" />
                </div>
              </section>

              {/* Project Types Selection */}
              <section>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">
                  Привязать к типам проектов
                </label>
                
                {/* Dropdown Multi-Select */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsProjectTypesDropdownOpen(!isProjectTypesDropdownOpen)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all shadow-inner flex items-center justify-between hover:bg-black/40"
                  >
                    <span className={selectedProjectTypeIds.length > 0 ? 'text-white' : 'text-white/40'}>
                      {selectedProjectTypeIds.length > 0
                        ? `Выбрано: ${selectedProjectTypeIds.length}`
                        : 'Выберите типы проектов'}
                    </span>
                    <svg
                      className={`w-4 h-4 text-white/40 transition-transform ${isProjectTypesDropdownOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {isProjectTypesDropdownOpen && (
                    <>
                      {/* Backdrop to close on click outside */}
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsProjectTypesDropdownOpen(false)}
                      />
                      <div className="absolute z-20 w-full mt-2 bg-gradient-to-b from-black/95 via-black/90 to-black/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                        {/* Selected items at top */}
                        {selectedProjectTypeIds.length > 0 && (
                          <div className="p-3 border-b border-white/10 bg-indigo-500/5">
                            <div className="flex flex-wrap gap-2">
                              {selectedProjectTypeIds.map((id) => {
                                const type = projectTypes.find(pt => pt.id === id);
                                if (!type) return null;
                                return (
                                  <span
                                    key={id}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/20 text-indigo-300 text-xs rounded-full border border-indigo-500/30"
                                  >
                                    {type.name}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleProjectType(id);
                                      }}
                                      className="hover:text-indigo-100 transition-colors"
                                      type="button"
                                    >
                                      <X size={12} />
                                    </button>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Options list */}
                        <div className="max-h-64 overflow-y-auto">
                          {projectTypes.length === 0 ? (
                            <div className="p-4 text-center text-white/60 text-sm">
                              Нет доступных типов проектов
                            </div>
                          ) : (
                            projectTypes.map((type) => {
                              const isSelected = selectedProjectTypeIds.includes(type.id);
                              return (
                                <label
                                  key={type.id}
                                  className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'bg-indigo-500/10 hover:bg-indigo-500/15'
                                      : 'hover:bg-white/5'
                                  }`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleProjectType(type.id)}
                                    className="w-4 h-4 rounded border-white/20 bg-black/30 text-indigo-500 focus:ring-indigo-500/50 focus:ring-offset-0 cursor-pointer"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <span className={`text-sm flex-1 ${isSelected ? 'text-indigo-300 font-medium' : 'text-white'}`}>
                                    {type.name}
                                  </span>
                                </label>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </section>

              {/* Description */}
              <section>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">
                  Описание
                </label>
                <textarea
                  value={agentDescription}
                  onChange={(e) => setAgentDescription(e.target.value)}
                  className="w-full h-20 bg-black/30 border border-white/10 rounded-xl p-3 text-xs text-white/90 focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent placeholder-white/20 resize-none transition-all shadow-inner"
                  placeholder="Краткое описание агента"
                />
              </section>

              {/* Model Selection */}
              <section>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">
                  Модель
                </label>
                <div className="relative group">
                  <select
                    value={agentModel}
                    onChange={(e) => setAgentModel(e.target.value as LLMModel)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 pl-10 pr-10 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all shadow-inner appearance-none cursor-pointer"
                  >
                    {MODELS.map((m) => (
                      <option key={m.id} value={m.id} className="bg-black text-white">
                        {m.name} - {m.description}
                      </option>
                    ))}
                  </select>
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    {renderModelIcon(agentModel)}
                  </div>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </section>

              {/* Knowledge Base Section */}
              <section className="bg-gradient-to-br from-emerald-900/20 to-teal-900/10 p-4 rounded-xl border border-emerald-500/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Brain size={16} className="text-emerald-300" />
                    <label className="block text-[10px] font-bold text-emerald-300 uppercase tracking-widest">
                      База знаний
                    </label>
                  </div>
                  <span className="px-2 py-1 bg-emerald-500/20 rounded-full text-[9px] text-emerald-300 font-semibold">
                    {agentFiles.filter(file => !file.name.startsWith('Summary')).length} файлов
                  </span>
                </div>
                
                {editingAgent && (
                  <>
                    <div 
                      onClick={() => !isUploadingFiles && fileInputRef.current?.click()}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-xl p-6 text-center transition-all group mb-3 ${
                        isUploadingFiles
                          ? 'border-emerald-500/20 bg-emerald-500/5 cursor-wait opacity-60'
                          : 'border-emerald-500/30 hover:border-emerald-400/60 hover:bg-emerald-500/10 bg-emerald-500/5 cursor-pointer'
                      }`}
                    >
                      {isUploadingFiles ? (
                        <>
                          <Loader2 className="mx-auto h-7 w-7 text-emerald-300/70 mb-2 animate-spin" />
                          <p className="text-xs font-medium text-emerald-200/80 transition-colors mb-1">
                            Загрузка файлов...
                          </p>
                        </>
                      ) : (
                        <>
                          <Upload className="mx-auto h-7 w-7 text-emerald-300/70 group-hover:text-emerald-300 mb-2 transition-colors duration-300" />
                          <p className="text-xs font-medium text-emerald-200/80 group-hover:text-emerald-200 transition-colors mb-1">
                            Перетащите файлы сюда или нажмите для загрузки
                          </p>
                          <p className="text-[10px] text-emerald-300/50">
                            .txt, .md файлы только
                          </p>
                        </>
                      )}
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden" 
                        multiple
                        accept=".txt,.md"
                        disabled={isUploadingFiles}
                      />
                    </div>

                    {/* File List */}
                    {(() => {
                      const knowledgeBaseFiles = agentFiles.filter(file => !file.name.startsWith('Summary'));
                      return knowledgeBaseFiles.length > 0 && (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {knowledgeBaseFiles.map((file) => (
                            <div key={file.id} className="flex items-center justify-between p-2.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/15 transition-colors">
                              <div className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-0">
                                <div className="bg-emerald-500/30 p-1.5 rounded text-emerald-200 shrink-0">
                                  <FileText size={14} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium text-white truncate">{file.name}</p>
                                  <p className="text-[9px] text-emerald-300/60 uppercase tracking-wider">{file.type.split('/')[1] || 'FILE'}</p>
                                </div>
                              </div>
                              <button 
                                onClick={() => handleRemoveFile(file.id)}
                                className="p-1.5 text-emerald-300/50 hover:text-red-400 transition-colors rounded hover:bg-red-500/10 shrink-0"
                                title="Удалить файл"
                                disabled={isUploadingFiles}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </>
                )}
              </section>

              {/* System Instruction */}
              <section>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">
                  Системная инструкция
                </label>
                <textarea
                  value={agentSystemInstruction}
                  onChange={(e) => setAgentSystemInstruction(e.target.value)}
                  className="w-full h-32 bg-black/30 border border-white/10 rounded-xl p-3 text-xs text-white/90 focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent placeholder-white/20 resize-none transition-all shadow-inner leading-relaxed"
                  placeholder="Определите поведение агента..."
                />
              </section>

              {/* Summary Instruction */}
              <section className="bg-gradient-to-br from-indigo-900/20 to-purple-900/10 p-4 rounded-xl border border-indigo-500/20">
                <div className="flex items-center gap-2 mb-2 text-indigo-300">
                  <FileCheck size={14} />
                  <label className="block text-[10px] font-bold uppercase tracking-widest">
                    Инструкция для сохранения результатов
                  </label>
                </div>
                <textarea
                  value={agentSummaryInstruction}
                  onChange={(e) => setAgentSummaryInstruction(e.target.value)}
                  className="w-full h-20 bg-black/20 border border-white/5 rounded-lg p-2 text-xs text-white/80 focus:ring-1 focus:ring-indigo-500/50 focus:border-transparent placeholder-white/20 resize-none transition-all"
                  placeholder="Инструкции для сохранения результатов..."
                />
              </section>

              {/* Role */}
              <section>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">
                  Роль
                </label>
                <div className="relative group">
                  <select
                    value={agentRole}
                    onChange={(e) => setAgentRole(e.target.value)}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 pr-10 text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all shadow-inner appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-black text-white">Не выбрано</option>
                    <option value="copywriter" className="bg-black text-white">Копирайтер</option>
                    <option value="layout" className="bg-black text-white">Верстальщик</option>
                    <option value="dsl" className="bg-black text-white">DSL</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </section>
            </div>

            {/* Dialog Footer */}
            <div className="p-6 border-t border-white/10 bg-black/20 backdrop-blur-xl shrink-0 flex gap-3">
              <button
                onClick={handleCloseAgentDialog}
                className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-semibold text-sm transition-all"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveAgent}
                disabled={isSavingAgent || !agentName.trim()}
                className="flex-1 px-4 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSavingAgent ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Сохранение...
                  </>
                ) : (
                  'Сохранить'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
      />

      <AlertDialog
        isOpen={alertDialog.isOpen}
        onClose={() => setAlertDialog(prev => ({ ...prev, isOpen: false }))}
        title={alertDialog.title}
        message={alertDialog.message}
        variant={alertDialog.variant}
        duration={3000}
      />
    </div>
  );
};
