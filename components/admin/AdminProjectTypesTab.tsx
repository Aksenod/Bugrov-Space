import React from 'react';
import { Plus, Loader2, Edit2, Trash2, ChevronDown } from 'lucide-react';
import {
  DndContext,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ApiProjectType, ApiProjectTypeAgent } from '../../services/api';
import { SortableAgentItem } from './SortableAgentItem';

interface AdminProjectTypesTabProps {
  projectTypes: ApiProjectType[];
  projectTypeAgents: Map<string, ApiProjectTypeAgent[]>;
  loadingAgentsForType: Set<string>;
  isLoading: boolean;
  isCreating: boolean;
  newTypeName: string;
  setNewTypeName: (name: string) => void;
  editingId: string | null;
  editingName: string;
  setEditingId: (id: string | null) => void;
  setEditingName: (name: string) => void;
  reorderingTypeId: string | null;
  collapsedTypes: Set<string>;

  // Actions
  onCreate: () => void;
  onStartEdit: (type: ApiProjectType) => void;
  onSaveEdit: (id: string) => void;
  onDelete: (id: string, name: string) => void;
  onDragEnd: (event: DragEndEvent, projectTypeId: string) => void;
  onToggleCollapse: (typeId: string) => void;
}

export const AdminProjectTypesTab: React.FC<AdminProjectTypesTabProps> = ({
  projectTypes,
  projectTypeAgents,
  loadingAgentsForType,
  isLoading,
  isCreating,
  newTypeName,
  setNewTypeName,
  editingId,
  editingName,
  setEditingId,
  setEditingName,
  reorderingTypeId,
  collapsedTypes,
  onCreate,
  onStartEdit,
  onSaveEdit,
  onDelete,
  onDragEnd,
  onToggleCollapse,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  return (
    <>
      {/* Create Form */}
      <div className="flex gap-1.5 sm:gap-2">
        <input
          type="text"
          value={newTypeName}
          onChange={(e) => setNewTypeName(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && onCreate()}
          placeholder="Название типа проекта"
          className="flex-1 px-2.5 sm:px-4 py-2 sm:py-2.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:border-transparent"
        />
        <button
          onClick={onCreate}
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
        <div className="space-y-3 sm:space-y-4">
          {projectTypes.map((type) => {
            const agentsRaw = projectTypeAgents.get(type.id) || [];
            // Сортируем агентов по полю order для правильного отображения
            const agents = [...agentsRaw].sort((a, b) => {
              if (a.order === b.order) {
                return a.name.localeCompare(b.name);
              }
              return (a.order ?? 0) - (b.order ?? 0);
            });
            const isLoadingAgents = loadingAgentsForType.has(type.id);

            return (
              <div
                key={type.id}
                className="bg-white/5 rounded-lg border border-white/10 overflow-hidden"
              >
                {/* Project Type Header */}
                <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-4 hover:bg-white/10 transition-colors">
                  {editingId === type.id ? (
                    <>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && onSaveEdit(type.id)}
                        className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-sm bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/70"
                        autoFocus
                      />
                      <button
                        onClick={() => onSaveEdit(type.id)}
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
                      <button
                        onClick={() => onToggleCollapse(type.id)}
                        className="p-1 rounded-lg text-white/40 hover:text-white/60 hover:bg-white/10 transition-all"
                        title={collapsedTypes.has(type.id) ? 'Развернуть' : 'Свернуть'}
                      >
                        <ChevronDown
                          size={16}
                          className={`sm:w-5 sm:h-5 transition-transform duration-200 ${collapsedTypes.has(type.id) ? '-rotate-90' : ''
                            }`}
                        />
                      </button>
                      <span className="flex-1 text-white text-sm sm:text-base font-medium">
                        {type.name}
                        {agents.length > 0 && (
                          <span className="ml-2 text-xs text-white/50">
                            ({agents.length} {agents.length === 1 ? 'агент' : agents.length < 5 ? 'агента' : 'агентов'})
                          </span>
                        )}
                      </span>
                      <button
                        onClick={() => onStartEdit(type)}
                        className="p-1.5 sm:p-2 rounded-lg text-white/60 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                        title="Редактировать"
                      >
                        <Edit2 size={14} className="sm:w-4 sm:h-4" />
                      </button>
                      {type.id !== 'default' && (
                        <button
                          onClick={() => onDelete(type.id, type.name)}
                          className="p-1.5 sm:p-2 rounded-lg text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          title="Удалить"
                        >
                          <Trash2 size={14} className="sm:w-4 sm:h-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Agents List */}
                {!editingId && !collapsedTypes.has(type.id) && (
                  <div className="px-2.5 sm:px-4 pb-2.5 sm:pb-4">
                    {isLoadingAgents ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 size={16} className="animate-spin text-indigo-400" />
                      </div>
                    ) : agents.length === 0 ? (
                      <div className="text-xs sm:text-sm text-white/40 py-2 px-2">
                        Нет прикрепленных агентов
                      </div>
                    ) : (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCorners}
                        onDragEnd={(e) => onDragEnd(e, type.id)}
                      >
                        <SortableContext
                          items={agents.map(a => a.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-1.5 sm:space-y-2 mt-2">
                            {agents.map((agent, index) => (
                              <SortableAgentItem
                                key={agent.id}
                                agent={agent}
                                index={index}
                              />
                            ))}
                          </div>
                        </SortableContext>
                      </DndContext>
                    )}
                    {reorderingTypeId === type.id && (
                      <div className="flex items-center justify-center py-2 mt-2">
                        <Loader2 size={14} className="animate-spin text-indigo-400 mr-2" />
                        <span className="text-xs text-white/60">Сохранение порядка...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};
