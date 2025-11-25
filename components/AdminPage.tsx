import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Edit2, Trash2, Loader2, Bot, Brain, Cpu, Zap, Edit3, FileCheck, Upload, FileText, Info, Layout, PenTool, Code2, Type } from 'lucide-react';
import { api, ApiProjectType, ApiProjectTypeAgent, ApiFile } from '../services/api';
import { LLMModel, MODELS, UploadedFile } from '../types';
import { AlertDialog } from './AlertDialog';
import { ConfirmDialog } from './ConfirmDialog';

interface AdminPageProps {
  onClose: () => void;
  initialAgentId?: string;
  onAgentUpdated?: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ onClose, initialAgentId, onAgentUpdated }) => {
  const [activeTab, setActiveTab] = useState<'projectTypes' | 'agents'>('agents');
  
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
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [agentFiles, setAgentFiles] = useState<UploadedFile[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoOpenedRef = useRef(false); // Флаг для отслеживания автоматического открытия
  const onAgentUpdatedRef = useRef(onAgentUpdated); // Храним актуальную версию callback
  const STORAGE_KEY = 'admin_agent_draft';
  
  // Обновляем ref при изменении callback
  useEffect(() => {
    onAgentUpdatedRef.current = onAgentUpdated;
  }, [onAgentUpdated]);

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

  // Сбрасываем флаг при изменении initialAgentId и переключаемся на вкладку агентов
  useEffect(() => {
    hasAutoOpenedRef.current = false;
    if (initialAgentId) {
      setActiveTab('agents');
    }
  }, [initialAgentId]);

  // Автоматически открываем диалог редактирования агента, если передан initialAgentId
  // Загружаем агента напрямую по ID, не дожидаясь загрузки списка
  useEffect(() => {
    if (initialAgentId && !isAgentDialogOpen && !hasAutoOpenedRef.current) {
      hasAutoOpenedRef.current = true; // Помечаем сразу, чтобы не открывать дважды
      
      let isMounted = true; // Флаг для отслеживания монтирования компонента
      
      const loadAndOpenAgent = async () => {
        try {
          // Загружаем агента напрямую по ID
          const { agent } = await api.getAgent(initialAgentId);
          
          // Проверяем, что компонент все еще смонтирован
          if (!isMounted) return;
          
          // Загружаем типы проектов для этого агента
          let projectTypes: Array<{ id: string; name: string; order?: number }> = [];
          try {
            const { projectTypes: types } = await api.getAgentProjectTypes(initialAgentId);
            projectTypes = types;
          } catch (error) {
            console.warn('Failed to load project types for agent', error);
          }
          
          // Проверяем, что компонент все еще смонтирован
          if (!isMounted) return;
          
          // Загружаем файлы агента-шаблона
          let agentFilesData: UploadedFile[] = [];
          try {
            const { files } = await api.getAdminAgentFiles(initialAgentId);
            agentFilesData = files.map(file => ({
              id: file.id,
              name: file.name,
              type: file.mimeType,
              data: file.content,
              agentId: file.agentId,
            }));
          } catch (error) {
            console.error('Failed to load agent files', error);
          }
          
          // Проверяем, что компонент все еще смонтирован перед установкой состояния
          if (!isMounted) return;
          
          // Подготавливаем агента с типами проектов
          const agentWithProjectTypes = {
            ...agent,
            projectTypes,
          };
          
          // Открываем диалог с загруженным агентом
          setEditingAgent(agentWithProjectTypes);
          setAgentName(agent.name);
          setAgentDescription(agent.description || '');
          setAgentSystemInstruction(agent.systemInstruction || '');
          setAgentSummaryInstruction(agent.summaryInstruction || '');
          setAgentModel(resolveModel(agent.model));
          setAgentRole(agent.role || '');
          setSelectedProjectTypeIds(projectTypes.map(pt => pt.id));
          setAgentFiles(agentFilesData);
          setIsAgentDialogOpen(true);
        } catch (error: any) {
          console.error('Failed to load agent directly', error);
          // Если не удалось загрузить агента напрямую, сбрасываем флаг
          // чтобы резервный вариант мог попытаться найти его в списке
          if (isMounted) {
            hasAutoOpenedRef.current = false;
          }
        }
      };
      
      loadAndOpenAgent();
      
      // Cleanup функция для предотвращения обновления состояния после размонтирования
      return () => {
        isMounted = false;
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAgentId, isAgentDialogOpen]);

  // Резервный вариант: если прямой загрузкой не получилось, пытаемся найти в списке
  useEffect(() => {
    if (initialAgentId && agents.length > 0 && !isAgentDialogOpen && !hasAutoOpenedRef.current) {
      const agentToEdit = agents.find(agent => agent.id === initialAgentId);
      if (agentToEdit) {
        hasAutoOpenedRef.current = true; // Помечаем, что диалог был открыт автоматически
        handleOpenAgentDialog(agentToEdit);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAgentId, agents, isAgentDialogOpen]);

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
      // Загружаем файлы агента-шаблона
      try {
        const { files } = await api.getAdminAgentFiles(agent.id);
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
    setIsRoleDropdownOpen(false);
    setIsModelDropdownOpen(false);
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
        // Уведомляем родительский компонент об обновлении агента
        // Используем ref для получения актуальной версии callback
        if (onAgentUpdatedRef.current) {
          onAgentUpdatedRef.current();
        }
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
  }, [agentName, agentDescription, agentSystemInstruction, agentSummaryInstruction, agentModel, agentRole, selectedProjectTypeIds, editingAgent?.id, onAgentUpdated]);

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
        const { file: uploaded } = await api.uploadAdminAgentFile(editingAgent.id, {
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
          await api.deleteAdminAgentFile(editingAgent.id, fileId);
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
      // Уведомляем родительский компонент об обновлении агента
      if (onAgentUpdated) {
        onAgentUpdated();
      }
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
    <div className="min-h-screen bg-gradient-to-br from-black via-black to-indigo-950/20 overflow-x-hidden">
      <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-6 max-w-6xl w-full">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Админ-панель</h1>
            <button
              onClick={onClose}
              className="px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/20 hover:text-white transition-colors flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
            >
              <X size={16} className="sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Назад</span>
            </button>
          </div>
            
            {/* Tabs */}
            <div className="flex gap-1.5 sm:gap-2">
              <button
                onClick={() => setActiveTab('agents')}
                className={`flex-1 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'agents'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
                }`}
              >
                Агенты
              </button>
              <button
                onClick={() => setActiveTab('projectTypes')}
                className={`flex-1 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  activeTab === 'projectTypes'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
                }`}
              >
                Типы проектов
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-3 sm:space-y-4">
            {activeTab === 'projectTypes' ? (
              <>
                {/* Create Form */}
                <div className="flex gap-1.5 sm:gap-2">
                  <input
                    type="text"
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCreate()}
                    placeholder="Название типа проекта"
                    className="flex-1 px-2.5 sm:px-4 py-2 sm:py-2.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-transparent"
                  />
                  <button
                    onClick={handleCreate}
                    disabled={isCreating || !newTypeName.trim()}
                    className="px-2.5 sm:px-4 py-2 sm:py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 sm:gap-2"
                  >
                    {isCreating ? <Loader2 size={14} className="sm:w-4 sm:h-4 animate-spin" /> : <Plus size={14} className="sm:w-4 sm:h-4" />}
                    <span className="hidden sm:inline">Создать</span>
                  </button>
                </div>

                {/* List */}
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={24} className="animate-spin text-indigo-400" />
                  </div>
                ) : (
                  <div className="space-y-1.5 sm:space-y-2">
                    {projectTypes.map((type) => (
                      <div
                        key={type.id}
                        className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                      >
                        {editingId === type.id ? (
                          <>
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit(type.id)}
                              className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-sm bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveEdit(type.id)}
                              className="px-2 sm:px-3 py-1.5 sm:py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors"
                            >
                              Сохранить
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(null);
                                setEditingName('');
                              }}
                              className="px-2 sm:px-3 py-1.5 sm:py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs sm:text-sm transition-colors"
                            >
                              Отмена
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-white text-sm sm:text-base font-medium">{type.name}</span>
                            <button
                              onClick={() => handleStartEdit(type)}
                              className="p-1.5 sm:p-2 rounded-lg text-white/60 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                              title="Редактировать"
                            >
                              <Edit2 size={14} className="sm:w-4 sm:h-4" />
                            </button>
                            {type.id !== 'default' && (
                              <button
                                onClick={() => handleDelete(type.id, type.name)}
                                className="p-1.5 sm:p-2 rounded-lg text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                title="Удалить"
                              >
                                <Trash2 size={14} className="sm:w-4 sm:h-4" />
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
                <div className="flex justify-between items-center mb-3 sm:mb-4">
                  <h2 className="text-base sm:text-lg font-bold text-white">Агенты-шаблоны</h2>
                  <button
                    onClick={() => handleOpenAgentDialog()}
                    className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1 sm:gap-2"
                  >
                    <Plus size={14} className="sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Создать агента</span>
                    <span className="sm:hidden">Создать</span>
                  </button>
                </div>

                {isLoadingAgents ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={24} className="animate-spin text-indigo-400" />
                  </div>
                ) : (
                  <div className="space-y-1.5 sm:space-y-2">
                    {agents.length === 0 ? (
                      <div className="text-center py-6 sm:py-8 text-sm sm:text-base text-white/60">
                        Нет агентов. Создайте первого агента.
                      </div>
                    ) : (
                      agents.map((agent) => (
                        <div
                          key={agent.id}
                          onClick={() => handleOpenAgentDialog(agent)}
                          className="p-2.5 sm:p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <div className="flex items-start justify-between gap-2 sm:gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                                <Bot size={16} className="sm:w-[18px] sm:h-[18px] text-indigo-400 shrink-0" />
                                <h3 className="text-sm sm:text-base text-white font-semibold truncate">{agent.name}</h3>
                              </div>
                              {agent.description && (
                                <p className="text-xs sm:text-sm text-white/60 mb-1.5 sm:mb-2 line-clamp-2">{agent.description}</p>
                              )}
                              {agent.projectTypes && agent.projectTypes.length > 0 && (
                                <div className="flex flex-wrap gap-1 sm:gap-2 mt-1.5 sm:mt-2">
                                  {agent.projectTypes.map((pt) => (
                                    <span
                                      key={pt.id}
                                      className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-indigo-500/20 text-indigo-300 text-[10px] sm:text-xs rounded-full border border-indigo-500/30"
                                    >
                                      {pt.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleOpenAgentDialog(agent)}
                                className="p-1.5 sm:p-2 rounded-lg text-white/60 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                                title="Редактировать"
                              >
                                <Edit2 size={14} className="sm:w-4 sm:h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteAgent(agent.id, agent.name)}
                                className="p-1.5 sm:p-2 rounded-lg text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                title="Удалить"
                              >
                                <Trash2 size={14} className="sm:w-4 sm:h-4" />
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
          className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-2 sm:p-4 overflow-x-hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsProjectTypesDropdownOpen(false);
              setIsRoleDropdownOpen(false);
              setIsModelDropdownOpen(false);
              // Не закрываем диалог при клике вне области, чтобы пользователь мог сохранить изменения
            }
          }}
        >
          <div className="w-full max-w-2xl bg-gradient-to-b from-black/90 via-black/80 to-black/90 backdrop-blur-2xl border border-white/10 rounded-xl sm:rounded-[2rem] shadow-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden mx-auto">
            {/* Dialog Header */}
            <div className="border-b border-white/10 bg-white/5 shrink-0">
              <div className="p-3 sm:p-4 md:p-6 flex justify-between items-center">
                <h2 className="text-base sm:text-lg md:text-xl font-bold text-white">
                  {editingAgent ? 'Редактировать агента' : 'Создать агента'}
                </h2>
                <button
                  onClick={handleCloseAgentDialog}
                  className="p-1.5 sm:p-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/20 hover:text-white transition-colors"
                >
                  <X size={18} className="sm:w-5 sm:h-5" />
                </button>
              </div>
              
              {/* Auto-save indicator */}
              <div className="px-3 sm:px-4 md:px-6 pb-2 sm:pb-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {(() => {
                      if (!editingAgent) return null;
                      
                      const hasChanges = 
                        agentName.trim() !== (editingAgent.name || '') ||
                        agentDescription.trim() !== (editingAgent.description || '') ||
                        agentSystemInstruction.trim() !== (editingAgent.systemInstruction || '') ||
                        agentSummaryInstruction.trim() !== (editingAgent.summaryInstruction || '') ||
                        agentModel !== resolveModel(editingAgent.model) ||
                        agentRole !== (editingAgent.role || '');
                      
                      if (isSavingAgent) {
                        return (
                          <>
                            <Loader2 size={12} className="animate-spin text-indigo-400" />
                            <span className="text-indigo-400">Сохранение...</span>
                          </>
                        );
                      }
                      
                      // Проверяем, есть ли активный таймер автосохранения
                      const isPendingSave = saveTimeoutRef.current !== null;
                      
                      if (hasChanges && isPendingSave) {
                        return (
                          <>
                            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                            <span className="text-amber-400">Сохранение через 1 сек...</span>
                          </>
                        );
                      }
                      
                      if (hasChanges && !isPendingSave) {
                        return (
                          <>
                            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                            <span className="text-amber-400">Изменения не сохранены</span>
                          </>
                        );
                      }
                      
                      return (
                        <>
                          <div className="w-2 h-2 rounded-full bg-emerald-400" />
                          <span className="text-emerald-400">Все изменения сохранены</span>
                        </>
                      );
                    })()}
                  </div>
                  <span className="text-white/30 text-[10px]">Автосохранение включено</span>
                </div>
              </div>
            </div>

            {/* Dialog Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">

              {/* Основная информация - Группа 1 */}
              <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 md:p-5 bg-gradient-to-br from-indigo-950/30 to-purple-950/20 rounded-xl sm:rounded-2xl border border-indigo-500/20">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                  <div className="p-1 sm:p-1.5 bg-indigo-500/20 rounded-lg">
                    <Bot size={12} className="sm:w-3.5 sm:h-3.5 text-indigo-300" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-white">Основная информация</h3>
                </div>
                
                {/* Agent Name */}
                <section>
                  <label className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 sm:mb-2">
                    Имя агента
                    <span className="text-red-400">*</span>
                    <div className="group relative">
                      <Info size={9} className="sm:w-2.5 sm:h-2.5 text-white/30 hover:text-white/60 cursor-help" />
                      <div className="absolute left-0 top-full mt-2 w-40 sm:w-48 p-1.5 sm:p-2 bg-black/95 border border-white/10 rounded-lg text-[9px] sm:text-[10px] text-white/80 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                        Уникальное имя для идентификации агента в системе
                      </div>
                    </div>
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      className={`w-full bg-black/40 border rounded-lg sm:rounded-xl px-2.5 sm:px-4 py-2 sm:py-3 pl-8 sm:pl-10 pr-14 sm:pr-20 text-xs sm:text-sm text-white focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all shadow-inner ${
                        !agentName.trim() 
                          ? 'border-red-500/30 focus:border-red-500/50' 
                          : 'border-white/10'
                      }`}
                      placeholder="Например: Ассистент по маркетингу"
                      maxLength={100}
                    />
                    <Edit3 size={12} className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-indigo-400 transition-colors sm:w-3.5 sm:h-3.5" />
                    <div className="absolute right-1.5 sm:right-3 top-1/2 -translate-y-1/2 text-[9px] sm:text-[10px] text-white/30">
                      {agentName.length}/100
                    </div>
                  </div>
                  {!agentName.trim() && (
                    <p className="mt-1 text-[9px] sm:text-[10px] text-red-400">Имя агента обязательно</p>
                  )}
                </section>

                {/* Description */}
                <section>
                  <label className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 sm:mb-2">
                    Описание
                    <div className="group relative">
                      <Info size={9} className="sm:w-2.5 sm:h-2.5 text-white/30 hover:text-white/60 cursor-help" />
                      <div className="absolute left-0 top-full mt-2 w-40 sm:w-48 p-1.5 sm:p-2 bg-black/95 border border-white/10 rounded-lg text-[9px] sm:text-[10px] text-white/80 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                        Краткое описание назначения и функций агента
                      </div>
                    </div>
                  </label>
                  <textarea
                    value={agentDescription}
                    onChange={(e) => setAgentDescription(e.target.value)}
                    className="w-full h-20 sm:h-24 bg-black/40 border border-white/10 rounded-lg sm:rounded-xl p-2 sm:p-3 text-xs text-white/90 focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent placeholder-white/20 resize-none transition-all shadow-inner"
                    placeholder="Опишите, для чего предназначен этот агент..."
                    maxLength={500}
                  />
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[9px] sm:text-[10px] text-white/30">Опционально</span>
                    <span className="text-[9px] sm:text-[10px] text-white/30">{agentDescription.length}/500</span>
                  </div>
                </section>
              </div>

              {/* Инструкции - Группа 2 */}
              <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 md:p-5 bg-gradient-to-br from-amber-950/30 to-orange-950/20 rounded-xl sm:rounded-2xl border border-amber-500/20">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                  <div className="p-1 sm:p-1.5 bg-amber-500/20 rounded-lg">
                    <PenTool size={12} className="sm:w-3.5 sm:h-3.5 text-amber-300" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-white">Инструкции агента</h3>
                </div>

                {/* System Instruction */}
                <section>
                  <label className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 sm:mb-2">
                    Системная инструкция
                    <span className="text-red-400">*</span>
                    <div className="group relative">
                      <Info size={9} className="sm:w-2.5 sm:h-2.5 text-white/30 hover:text-white/60 cursor-help" />
                      <div className="absolute left-0 top-full mt-2 w-52 sm:w-64 p-1.5 sm:p-2 bg-black/95 border border-white/10 rounded-lg text-[9px] sm:text-[10px] text-white/80 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                        Основные правила поведения агента. Опишите, как агент должен отвечать на вопросы и взаимодействовать с пользователем.
                      </div>
                    </div>
                  </label>
                  <textarea
                    value={agentSystemInstruction}
                    onChange={(e) => setAgentSystemInstruction(e.target.value)}
                    className={`w-full h-32 sm:h-40 bg-black/40 border rounded-lg sm:rounded-xl p-2 sm:p-3 text-xs text-white/90 focus:ring-2 focus:ring-amber-500/50 focus:border-transparent placeholder-white/20 resize-none transition-all shadow-inner leading-relaxed font-mono ${
                      !agentSystemInstruction.trim() 
                        ? 'border-red-500/30 focus:border-red-500/50' 
                        : 'border-white/10'
                    }`}
                    placeholder="Ты - полезный AI-ассистент. Твоя задача - помогать пользователям..."
                    maxLength={5000}
                  />
                  <div className="flex justify-between items-center mt-1">
                    {!agentSystemInstruction.trim() ? (
                      <span className="text-[9px] sm:text-[10px] text-red-400">Системная инструкция обязательна</span>
                    ) : (
                      <span className="text-[9px] sm:text-[10px] text-white/30">Рекомендуется: 200-1000 символов</span>
                    )}
                    <span className="text-[9px] sm:text-[10px] text-white/30">{agentSystemInstruction.length}/5000</span>
                  </div>
                </section>

                {/* Summary Instruction */}
                <section className="bg-gradient-to-br from-indigo-900/20 to-purple-900/10 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-indigo-500/20">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 text-indigo-300">
                    <FileCheck size={12} className="sm:w-3.5 sm:h-3.5" />
                    <label className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest">
                      Инструкция для сохранения результатов
                      <div className="group relative">
                        <Info size={9} className="sm:w-2.5 sm:h-2.5 text-indigo-300/50 hover:text-indigo-300 cursor-help" />
                        <div className="absolute left-0 top-full mt-2 w-52 sm:w-64 p-1.5 sm:p-2 bg-black/95 border border-white/10 rounded-lg text-[9px] sm:text-[10px] text-white/80 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                          Укажите, как агент должен форматировать и сохранять результаты работы
                        </div>
                      </div>
                    </label>
                  </div>
                  <textarea
                    value={agentSummaryInstruction}
                    onChange={(e) => setAgentSummaryInstruction(e.target.value)}
                    className="w-full h-20 sm:h-24 bg-black/30 border border-white/10 rounded-lg p-2 sm:p-3 text-xs text-white/80 focus:ring-1 focus:ring-indigo-500/50 focus:border-transparent placeholder-white/20 resize-none transition-all"
                    placeholder="Сохраняй результаты в формате Markdown. Используй заголовки для структуры..."
                    maxLength={2000}
                  />
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[9px] sm:text-[10px] text-white/30">Опционально</span>
                    <span className="text-[9px] sm:text-[10px] text-white/30">{agentSummaryInstruction.length}/2000</span>
                  </div>
                </section>
              </div>

              {/* Конфигурация модели - Группа 3 */}
              <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 md:p-5 bg-gradient-to-br from-purple-950/30 to-pink-950/20 rounded-xl sm:rounded-2xl border border-purple-500/20">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                  <div className="p-1 sm:p-1.5 bg-purple-500/20 rounded-lg">
                    <Cpu size={12} className="sm:w-3.5 sm:h-3.5 text-purple-300" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-white">Конфигурация модели</h3>
                </div>

                {/* Model Selection - компактный вид */}
                <section>
                  <label className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 sm:mb-2">
                    Модель ИИ
                    <span className="text-red-400">*</span>
                    <div className="group relative">
                      <Info size={9} className="sm:w-2.5 sm:h-2.5 text-white/30 hover:text-white/60 cursor-help" />
                      <div className="absolute left-0 top-full mt-2 w-48 sm:w-56 p-1.5 sm:p-2 bg-black/95 border border-white/10 rounded-lg text-[9px] sm:text-[10px] text-white/80 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                        Выберите модель для обработки запросов. GPT-5.1 - самый мощный, GPT-4o-mini - самый быстрый
                      </div>
                    </div>
                  </label>
                  
                  {/* Компактный вид - показываем только выбранную модель */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsModelDropdownOpen(!isModelDropdownOpen);
                        setIsProjectTypesDropdownOpen(false);
                        setIsRoleDropdownOpen(false);
                      }}
                      className="w-full bg-black/40 border border-white/10 rounded-lg sm:rounded-xl px-2.5 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-white focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all shadow-inner flex items-center justify-between hover:bg-black/50 group"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                        {(() => {
                          const selectedModel = MODELS.find(m => m.id === agentModel);
                          if (!selectedModel) return null;
                          return (
                            <>
                              <div className="p-1.5 sm:p-2 rounded-lg bg-purple-500/30 shrink-0">
                                {renderModelIcon(selectedModel.id as LLMModel)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                  <span className="text-xs sm:text-sm font-bold text-white">
                                    {selectedModel.name}
                                  </span>
                                  <span className="text-[9px] sm:text-[10px] text-purple-300 font-semibold bg-purple-500/20 px-1.5 sm:px-2 py-0.5 rounded-full">
                                    {selectedModel.id === LLMModel.GPT4O_MINI ? '⚡ Быстрая' : selectedModel.id === LLMModel.GPT51 ? '🧠 Мощная' : '💎 Сбалансированная'}
                                  </span>
                                </div>
                                <p className="text-[9px] sm:text-[10px] text-white/60 truncate mt-0.5 text-left">
                                  {selectedModel.description}
                                </p>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      <svg
                        className={`w-4 h-4 text-white/40 transition-transform shrink-0 ml-2 ${isModelDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {isModelDropdownOpen && (
                      <>
                        {/* Backdrop to close on click outside */}
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setIsModelDropdownOpen(false)}
                        />
                        <div className="absolute z-20 w-full mt-2 bg-gradient-to-b from-black/95 via-black/90 to-black/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                          <div className="py-1">
                            {MODELS.map((m) => {
                              const isSelected = agentModel === m.id;
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAgentModel(m.id);
                                    setIsModelDropdownOpen(false);
                                  }}
                                  className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${
                                    isSelected
                                      ? 'bg-purple-500/10 hover:bg-purple-500/15'
                                      : 'hover:bg-white/5'
                                  }`}
                                >
                                  <div className={`p-2 rounded-lg shrink-0 ${
                                    isSelected ? 'bg-purple-500/30' : 'bg-white/5'
                                  }`}>
                                    {renderModelIcon(m.id as LLMModel)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-white/80'}`}>
                                        {m.name}
                                      </span>
                                      <span className="text-[10px] text-white/50">
                                        {m.id === LLMModel.GPT4O_MINI ? '⚡ Быстрая' : m.id === LLMModel.GPT51 ? '🧠 Мощная' : '💎 Сбалансированная'}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-white/60 leading-relaxed text-left">
                                      {m.description}
                                    </p>
                                  </div>
                                  {isSelected && (
                                    <div className="flex items-center gap-2 shrink-0">
                                      <div className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,1)]"></div>
                                      <span className="text-[10px] text-purple-300 font-semibold">Выбрано</span>
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </section>
              </div>

              {/* Привязки - Группа 4 */}
              <div className="space-y-3 sm:space-y-4 p-3 sm:p-4 md:p-5 bg-gradient-to-br from-cyan-950/30 to-blue-950/20 rounded-xl sm:rounded-2xl border border-cyan-500/20">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                  <div className="p-1 sm:p-1.5 bg-cyan-500/20 rounded-lg">
                    <Layout size={12} className="sm:w-3.5 sm:h-3.5 text-cyan-300" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-bold text-white">Привязки к проектам</h3>
                </div>

                {/* Project Types Selection */}
                <section>
                  <label className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 sm:mb-2">
                    Типы проектов
                    <div className="group relative">
                      <Info size={9} className="sm:w-2.5 sm:h-2.5 text-white/30 hover:text-white/60 cursor-help" />
                      <div className="absolute left-0 top-full mt-2 w-40 sm:w-48 p-1.5 sm:p-2 bg-black/95 border border-white/10 rounded-lg text-[9px] sm:text-[10px] text-white/80 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                        Выберите типы проектов, где будет доступен этот агент
                      </div>
                    </div>
                  </label>
                
                {/* Dropdown Multi-Select */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProjectTypesDropdownOpen(!isProjectTypesDropdownOpen);
                      setIsRoleDropdownOpen(false);
                      setIsModelDropdownOpen(false);
                    }}
                    className="w-full bg-black/40 border border-white/10 rounded-lg sm:rounded-xl px-2.5 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-white focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent transition-all shadow-inner flex items-center justify-between hover:bg-black/50 min-h-[40px] sm:min-h-[48px]"
                  >
                    <div className="flex-1 flex items-center gap-2 flex-wrap min-w-0">
                      {selectedProjectTypeIds.length > 0 ? (
                        <>
                          {selectedProjectTypeIds.slice(0, 2).map((id) => {
                            const type = projectTypes.find(pt => pt.id === id);
                            if (!type) return null;
                            return (
                              <span
                                key={id}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500/20 text-cyan-300 text-xs rounded-full border border-cyan-500/30 font-medium shrink-0"
                              >
                                {type.name}
                              </span>
                            );
                          })}
                          {selectedProjectTypeIds.length > 2 && (
                            <span className="text-xs text-white/60 font-medium">
                              +{selectedProjectTypeIds.length - 2}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-white/40">Выберите типы проектов</span>
                      )}
                    </div>
                    <svg
                      className={`w-4 h-4 text-white/40 transition-transform shrink-0 ml-2 ${isProjectTypesDropdownOpen ? 'rotate-180' : ''}`}
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
                          <div className="p-3 border-b border-white/10 bg-cyan-500/5">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">
                                Выбрано: {selectedProjectTypeIds.length}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedProjectTypeIds([]);
                                }}
                                className="text-[10px] text-cyan-300/60 hover:text-cyan-300 transition-colors"
                                type="button"
                              >
                                Очистить все
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {selectedProjectTypeIds.map((id) => {
                                const type = projectTypes.find(pt => pt.id === id);
                                if (!type) return null;
                                return (
                                  <span
                                    key={id}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-cyan-500/20 text-cyan-300 text-xs rounded-full border border-cyan-500/30"
                                  >
                                    {type.name}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleProjectType(id);
                                      }}
                                      className="hover:text-cyan-100 transition-colors rounded-full hover:bg-cyan-500/20 p-0.5"
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
                                      ? 'bg-cyan-500/10 hover:bg-cyan-500/15'
                                      : 'hover:bg-white/5'
                                  }`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleProjectType(type.id)}
                                    className="w-4 h-4 rounded border-white/20 bg-black/30 text-cyan-500 focus:ring-cyan-500/50 focus:ring-offset-0 cursor-pointer"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <span className={`text-sm flex-1 ${isSelected ? 'text-cyan-300 font-medium' : 'text-white'}`}>
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

                {/* Role */}
                <section>
                  <label className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1.5 sm:mb-2">
                    Специализация
                    <div className="group relative">
                      <Info size={9} className="sm:w-2.5 sm:h-2.5 text-white/30 hover:text-white/60 cursor-help" />
                      <div className="absolute left-0 top-full mt-2 w-40 sm:w-48 p-1.5 sm:p-2 bg-black/95 border border-white/10 rounded-lg text-[9px] sm:text-[10px] text-white/80 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                        Роль определяет особое поведение агента в системе
                      </div>
                    </div>
                  </label>
                  
                  {/* Custom Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRoleDropdownOpen(!isRoleDropdownOpen);
                        setIsProjectTypesDropdownOpen(false);
                      }}
                      className="w-full bg-black/40 border border-white/10 rounded-lg sm:rounded-xl px-2.5 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-white focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent transition-all shadow-inner flex items-center justify-between hover:bg-black/50 group"
                    >
                      <div className="flex items-center gap-3">
                        {(() => {
                          const roleConfig = {
                            '': { icon: null, label: 'Не выбрано', color: 'text-white/40' },
                            'copywriter': { icon: PenTool, label: 'Копирайтер', color: 'text-cyan-300' },
                            'layout': { icon: Layout, label: 'Верстальщик', color: 'text-purple-300' },
                            'dsl': { icon: Code2, label: 'DSL', color: 'text-emerald-300' },
                          };
                          const config = roleConfig[agentRole as keyof typeof roleConfig] || roleConfig[''];
                          const Icon = config.icon;
                          return (
                            <>
                              {Icon && (
                                <div className={`p-1.5 rounded-lg bg-${agentRole === 'copywriter' ? 'cyan' : agentRole === 'layout' ? 'purple' : agentRole === 'dsl' ? 'emerald' : 'white'}-500/20`}>
                                  <Icon size={14} className={config.color} />
                                </div>
                              )}
                              <span className={agentRole ? 'text-white' : 'text-white/40'}>
                                {config.label}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                      <svg
                        className={`w-4 h-4 text-white/40 transition-transform ${isRoleDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Dropdown Menu */}
                    {isRoleDropdownOpen && (
                      <>
                        {/* Backdrop to close on click outside */}
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setIsRoleDropdownOpen(false)}
                        />
                        <div className="absolute z-20 w-full mt-2 bg-gradient-to-b from-black/95 via-black/90 to-black/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                          <div className="py-1">
                            {[
                              { value: '', label: 'Не выбрано', icon: null, color: 'text-white/60' },
                              { value: 'copywriter', label: 'Копирайтер', icon: PenTool, color: 'text-cyan-300', bgColor: 'bg-cyan-500/20', borderColor: 'border-cyan-500/30' },
                              { value: 'layout', label: 'Верстальщик', icon: Layout, color: 'text-purple-300', bgColor: 'bg-purple-500/20', borderColor: 'border-purple-500/30' },
                              { value: 'dsl', label: 'DSL', icon: Code2, color: 'text-emerald-300', bgColor: 'bg-emerald-500/20', borderColor: 'border-emerald-500/30' },
                            ].map((role) => {
                              const isSelected = agentRole === role.value;
                              const Icon = role.icon;
                              return (
                                <button
                                  key={role.value}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAgentRole(role.value);
                                    setIsRoleDropdownOpen(false);
                                  }}
                                  className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                                    isSelected
                                      ? 'bg-cyan-500/10 hover:bg-cyan-500/15'
                                      : 'hover:bg-white/5'
                                  }`}
                                >
                                  {Icon ? (
                                    <div className={`p-1.5 rounded-lg ${isSelected ? role.bgColor : 'bg-white/5'} border ${isSelected ? role.borderColor : 'border-white/10'}`}>
                                      <Icon size={14} className={isSelected ? role.color : 'text-white/50'} />
                                    </div>
                                  ) : (
                                    <div className="w-8 h-8" />
                                  )}
                                  <span className={`text-sm flex-1 text-left ${isSelected ? 'text-cyan-300 font-medium' : 'text-white'}`}>
                                    {role.label}
                                  </span>
                                  {isSelected && (
                                    <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,1)]"></div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </section>
              </div>

              {/* База знаний - Группа 5 */}
              <section className="bg-gradient-to-br from-emerald-900/20 to-teal-900/10 p-3 sm:p-4 md:p-5 rounded-xl sm:rounded-2xl border border-emerald-500/20">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="p-1 sm:p-1.5 bg-emerald-500/20 rounded-lg">
                      <Brain size={14} className="sm:w-4 sm:h-4 text-emerald-300" />
                    </div>
                    <label className="block text-xs sm:text-sm font-bold text-emerald-300">
                      База знаний
                    </label>
                    <div className="group relative">
                      <Info size={9} className="sm:w-2.5 sm:h-2.5 text-emerald-300/50 hover:text-emerald-300 cursor-help" />
                      <div className="absolute left-0 top-full mt-2 w-48 sm:w-56 p-1.5 sm:p-2 bg-black/95 border border-white/10 rounded-lg text-[9px] sm:text-[10px] text-white/80 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                        Загрузите документы (.txt, .md), которые агент будет использовать как справочную информацию
                      </div>
                    </div>
                  </div>
                  <span className="px-2 sm:px-3 py-1 sm:py-1.5 bg-emerald-500/20 rounded-full text-[10px] sm:text-xs text-emerald-300 font-semibold border border-emerald-500/30">
                    {agentFiles.filter(file => !file.name.startsWith('Summary')).length} файлов
                  </span>
                </div>
                
                {editingAgent && (
                  <>
                    <div 
                      onClick={() => !isUploadingFiles && fileInputRef.current?.click()}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-lg sm:rounded-xl p-4 sm:p-6 text-center transition-all group mb-2 sm:mb-3 ${
                        isUploadingFiles
                          ? 'border-emerald-500/20 bg-emerald-500/5 cursor-wait opacity-60'
                          : 'border-emerald-500/30 hover:border-emerald-400/60 hover:bg-emerald-500/10 bg-emerald-500/5 cursor-pointer'
                      }`}
                    >
                      {isUploadingFiles ? (
                        <>
                          <Loader2 className="mx-auto h-5 w-5 sm:h-7 sm:w-7 text-emerald-300/70 mb-1.5 sm:mb-2 animate-spin" />
                          <p className="text-[10px] sm:text-xs font-medium text-emerald-200/80 transition-colors mb-1">
                            Загрузка файлов...
                          </p>
                        </>
                      ) : (
                        <>
                          <Upload className="mx-auto h-5 w-5 sm:h-7 sm:w-7 text-emerald-300/70 group-hover:text-emerald-300 mb-1.5 sm:mb-2 transition-colors duration-300" />
                          <p className="text-[10px] sm:text-xs font-medium text-emerald-200/80 group-hover:text-emerald-200 transition-colors mb-1">
                            Перетащите файлы сюда или нажмите для загрузки
                          </p>
                          <p className="text-[9px] sm:text-[10px] text-emerald-300/50">
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

            </div>

            {/* Dialog Footer */}
            <div className="p-3 sm:p-4 md:p-6 border-t border-white/10 bg-black/20 backdrop-blur-xl shrink-0 flex gap-2 sm:gap-3">
              <button
                onClick={handleCloseAgentDialog}
                className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveAgent}
                disabled={isSavingAgent || !agentName.trim()}
                className="flex-1 px-3 sm:px-4 py-2 sm:py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg sm:rounded-xl font-semibold text-xs sm:text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2"
              >
                {isSavingAgent ? (
                  <>
                    <Loader2 size={14} className="sm:w-4 sm:h-4 animate-spin" />
                    <span className="hidden sm:inline">Сохранение...</span>
                    <span className="sm:hidden">Сохранение</span>
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
