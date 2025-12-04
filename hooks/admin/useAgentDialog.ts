import { useState, useRef, useEffect } from 'react';
import { ApiProjectTypeAgent } from '../../services/api';
import { api } from '../../services/api';
import { LLMModel } from '../../types';
import { resolveModel } from '../../components/admin';
import { UploadedFile } from '../../types';

const STORAGE_KEY = 'admin_agent_draft';

interface UseAgentDialogProps {
  onAgentUpdated?: () => void;
  projectTypes: any[];
}

export const useAgentDialog = ({ onAgentUpdated, projectTypes }: UseAgentDialogProps) => {
  const [isAgentDialogOpen, setIsAgentDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<ApiProjectTypeAgent | null>(null);
  const [agentFiles, setAgentFiles] = useState<UploadedFile[]>([]);
  const onAgentUpdatedRef = useRef(onAgentUpdated);

  useEffect(() => {
    onAgentUpdatedRef.current = onAgentUpdated;
  }, [onAgentUpdated]);

  const handleOpenAgentDialog = async (agent?: ApiProjectTypeAgent) => {
    if (agent) {
      setEditingAgent(agent);
      // Загружаем файлы агента-шаблона только если есть ID
      if (agent.id) {
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
      } else {
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
          model: LLMModel.GPT5_MINI,
          isHiddenFromSidebar: false,
        });
        setEditingAgent(newAgent);
        setAgentFiles([]);
      } catch (error: any) {
        console.error('Failed to create agent', error);
        throw error;
      }
    }
    setIsAgentDialogOpen(true);
  };

  const handleCloseAgentDialog = () => {
    // Очищаем черновик при закрытии
    localStorage.removeItem(STORAGE_KEY);
    setIsAgentDialogOpen(false);
    setEditingAgent(null);
    setAgentFiles([]);
  };

  return {
    isAgentDialogOpen,
    editingAgent,
    agentFiles,
    setAgentFiles,
    handleOpenAgentDialog,
    handleCloseAgentDialog,
    onAgentUpdatedRef,
  };
};

