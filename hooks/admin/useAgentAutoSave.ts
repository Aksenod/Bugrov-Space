import { useRef, useEffect } from 'react';
import { ApiProjectTypeAgent } from '../../services/api';
import { LLMModel } from '../../types';
import { api } from '../../services/api';

interface UseAgentAutoSaveProps {
  editingAgent: ApiProjectTypeAgent | null;
  agentName: string;
  agentDescription: string;
  agentSystemInstruction: string;
  agentSummaryInstruction: string;
  agentModel: LLMModel;
  agentRole: string;
  agentIsHiddenFromSidebar: boolean;
  agentQuickMessages: string[];
  selectedProjectTypeIds: string[];
  initialProjectTypeIdsRef: React.MutableRefObject<string[]>;
  onAgentUpdatedRef: React.MutableRefObject<(() => void) | undefined>;
  loadAgents: () => Promise<void>;
  loadAgentsForType: (typeId: string) => Promise<void>;
  onEditingAgentUpdated?: (agent: ApiProjectTypeAgent) => void;
}

export const useAgentAutoSave = ({
  editingAgent,
  agentName,
  agentDescription,
  agentSystemInstruction,
  agentSummaryInstruction,
  agentModel,
  agentRole,
  agentIsHiddenFromSidebar,
  agentQuickMessages,
  selectedProjectTypeIds,
  initialProjectTypeIdsRef,
  onAgentUpdatedRef,
  loadAgents,
  loadAgentsForType,
  onEditingAgentUpdated,
}: UseAgentAutoSaveProps) => {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const autoSaveAgent = async () => {
    if (!editingAgent || !agentName?.trim()) {
      return;
    }
    
    // Не сохраняем, если у агента нет ID (новый агент еще не создан на сервере)
    if (!editingAgent.id) {
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await api.updateAgentTemplate(editingAgent.id, {
          name: agentName?.trim() || '',
          description: agentDescription?.trim() || '',
          systemInstruction: agentSystemInstruction?.trim() || '',
          summaryInstruction: agentSummaryInstruction?.trim() || '',
          model: agentModel,
          role: agentRole?.trim() || undefined,
          isHiddenFromSidebar: agentIsHiddenFromSidebar,
          quickMessages: agentQuickMessages || [],
        });
        
        // Обновляем привязки к типам проектов только если они действительно изменились
        const initialIds = initialProjectTypeIdsRef.current;
        const currentIds = selectedProjectTypeIds;
        const idsChanged = initialIds.length !== currentIds.length || 
          !initialIds.every(id => currentIds.includes(id)) ||
          !currentIds.every(id => initialIds.includes(id));
        
        if (idsChanged) {
          try {
            await api.attachAgentToProjectTypes(editingAgent.id, selectedProjectTypeIds);
            initialProjectTypeIdsRef.current = [...selectedProjectTypeIds];
            const allAffectedTypes = new Set([
              ...selectedProjectTypeIds,
              ...(editingAgent.projectTypes?.map(pt => pt.id) || [])
            ]);
            await Promise.all(Array.from(allAffectedTypes).map(typeId => loadAgentsForType(typeId)));
          } catch (error: any) {
            // Failed to attach project types - non-critical
          }
        }
        
        await loadAgents();
        if (onAgentUpdatedRef.current) {
          onAgentUpdatedRef.current();
        }
        
        // Перезагружаем агента, чтобы обновить editingAgent с актуальными данными
        try {
          const { agent: updatedAgent } = await api.getAgent(editingAgent.id);
          // Загружаем типы проектов для обновленного агента
          let projectTypes: Array<{ id: string; name: string; order?: number }> = [];
          try {
            const { projectTypes: types } = await api.getAgentProjectTypes(editingAgent.id);
            projectTypes = types;
          } catch (error) {
            // Failed to load project types for agent after auto-save - non-critical
          }
          
          const agentWithProjectTypes = {
            ...updatedAgent,
            projectTypes,
          };
          
          // Обновляем editingAgent через callback
          if (onEditingAgentUpdated) {
            onEditingAgentUpdated(agentWithProjectTypes);
          }
          
          // Очищаем таймер после успешного сохранения
          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
          }
        } catch (error) {
          // Failed to reload agent after auto-save - non-critical
        }
      } catch (error: any) {
        // Auto-save failed - non-critical, user can save manually
      }
    }, 1000);
  };

  // Автосохранение при изменении полей
  useEffect(() => {
    // Автосохранение работает только если агент создан (имеет ID)
    if (editingAgent && editingAgent.id) {
      autoSaveAgent();
    }
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [agentName, agentDescription, agentSystemInstruction, agentSummaryInstruction, agentModel, agentRole, agentIsHiddenFromSidebar, agentQuickMessages, selectedProjectTypeIds, editingAgent?.id]);

  const clearSaveTimeout = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  };

  return {
    saveTimeoutRef,
    clearSaveTimeout,
  };
};

