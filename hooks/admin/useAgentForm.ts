import { useState, useEffect, useRef } from 'react';
import { ApiProjectTypeAgent } from '../../services/api';
import { LLMModel } from '../../types';
import { resolveModel } from '../../components/admin';

interface UseAgentFormProps {
  editingAgent: ApiProjectTypeAgent | null;
  isDialogOpen: boolean;
}

const STORAGE_KEY = 'admin_agent_draft';

export const useAgentForm = ({ editingAgent, isDialogOpen }: UseAgentFormProps) => {
  const [agentName, setAgentName] = useState('');
  const [agentDescription, setAgentDescription] = useState('');
  const [agentSystemInstruction, setAgentSystemInstruction] = useState('');
  const [agentSummaryInstruction, setAgentSummaryInstruction] = useState('');
  const [agentModel, setAgentModel] = useState<LLMModel>(LLMModel.GPT5_MINI);
  const [agentRole, setAgentRole] = useState('');
  const [agentIsHiddenFromSidebar, setAgentIsHiddenFromSidebar] = useState(false);
  const [agentQuickMessages, setAgentQuickMessages] = useState<string[]>([]);
  const [selectedProjectTypeIds, setSelectedProjectTypeIds] = useState<string[]>([]);
  const [isProjectTypesDropdownOpen, setIsProjectTypesDropdownOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const initialProjectTypeIdsRef = useRef<string[]>([]);

  // Инициализация формы при открытии диалога
  useEffect(() => {
    if (editingAgent && isDialogOpen) {
      setAgentName(editingAgent.name);
      setAgentDescription(editingAgent.description || '');
      setAgentSystemInstruction(editingAgent.systemInstruction || '');
      setAgentSummaryInstruction(editingAgent.summaryInstruction || '');
      setAgentModel(resolveModel(editingAgent.model));
      setAgentRole(editingAgent.role || '');
      setAgentIsHiddenFromSidebar(editingAgent.isHiddenFromSidebar || false);
      setAgentQuickMessages(editingAgent.quickMessages || []);
      const projectTypeIds = editingAgent.projectTypes?.map(pt => pt.id) || [];
      setSelectedProjectTypeIds(projectTypeIds);
      initialProjectTypeIdsRef.current = [...projectTypeIds];
    }
  }, [editingAgent, isDialogOpen]);

  // Восстановление из localStorage
  useEffect(() => {
    if (isDialogOpen && editingAgent) {
      try {
        const draftStr = localStorage.getItem(STORAGE_KEY);
        if (!draftStr) return;

        const draft = JSON.parse(draftStr);
        if (draft.agentId && editingAgent && draft.agentId === editingAgent.id) {
          setAgentName(draft.name || '');
          setAgentDescription(draft.description || '');
          setAgentSystemInstruction(draft.systemInstruction || '');
          setAgentSummaryInstruction(draft.summaryInstruction || '');
          setAgentModel(draft.model || LLMModel.GPT5_MINI);
          setAgentRole(draft.role || '');
          setAgentIsHiddenFromSidebar(draft.isHiddenFromSidebar || false);
          setAgentQuickMessages(draft.quickMessages || []);
          const projectTypeIds = draft.selectedProjectTypeIds || [];
          setSelectedProjectTypeIds(projectTypeIds);
          initialProjectTypeIdsRef.current = [...projectTypeIds];
        }
      } catch (error) {
        console.error('Failed to load draft from localStorage', error);
      }
    }
  }, [isDialogOpen, editingAgent]);

  // Сохранение в localStorage
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
      isHiddenFromSidebar: agentIsHiddenFromSidebar,
      quickMessages: agentQuickMessages,
      selectedProjectTypeIds,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch (error) {
      console.error('Failed to save draft to localStorage', error);
    }
  };

  // Сохраняем в localStorage при изменении полей
  useEffect(() => {
    if (editingAgent && isDialogOpen) {
      saveDraftToStorage();
    }
  }, [agentName, agentDescription, agentSystemInstruction, agentSummaryInstruction, agentModel, agentRole, agentIsHiddenFromSidebar, agentQuickMessages, selectedProjectTypeIds, editingAgent?.id, isDialogOpen]);

  const toggleProjectType = (projectTypeId: string) => {
    setSelectedProjectTypeIds(prev =>
      prev.includes(projectTypeId)
        ? prev.filter(id => id !== projectTypeId)
        : [...prev, projectTypeId]
    );
  };

  return {
    // Form state
    agentName,
    setAgentName,
    agentDescription,
    setAgentDescription,
    agentSystemInstruction,
    setAgentSystemInstruction,
    agentSummaryInstruction,
    setAgentSummaryInstruction,
    agentModel,
    setAgentModel,
    agentRole,
    setAgentRole,
    agentIsHiddenFromSidebar,
    setAgentIsHiddenFromSidebar,
    agentQuickMessages,
    setAgentQuickMessages,
    selectedProjectTypeIds,
    setSelectedProjectTypeIds,
    // Dropdowns
    isProjectTypesDropdownOpen,
    setIsProjectTypesDropdownOpen,
    isRoleDropdownOpen,
    setIsRoleDropdownOpen,
    isModelDropdownOpen,
    setIsModelDropdownOpen,
    // Helpers
    toggleProjectType,
    initialProjectTypeIdsRef,
  };
};

