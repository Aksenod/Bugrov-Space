import React, { useMemo } from 'react';
import { Plus, Loader2, Filter, X, Search, ChevronDown, ArrowUp, ArrowDown, Trash2, Calendar } from 'lucide-react';
import { ApiProjectType, ApiProjectTypeAgent } from '../../services/api';
import { MODELS } from '../../types';
import { SortBy, SortOrder } from './types';
import { formatDate, getAgentIcon } from './utils';

interface AdminAgentsTabProps {
  agents: ApiProjectTypeAgent[];
  isLoadingAgents: boolean;
  projectTypes: ApiProjectType[];

  // Filters and sorting
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedProjectTypeFilters: string[];
  selectedRoleFilters: string[];
  selectedModelFilters: string[];
  sortBy: SortBy;
  sortOrder: SortOrder;
  setSortBy: (sortBy: SortBy) => void;
  setSortOrder: (sortOrder: SortOrder) => void;
  isFiltersOpen: boolean;
  setIsFiltersOpen: (isOpen: boolean) => void;

  // Actions
  onCreateAgent: () => void;
  onEditAgent: (agent: ApiProjectTypeAgent) => void;
  onDeleteAgent: (id: string, name: string) => void;
  onToggleProjectTypeFilter: (projectTypeId: string) => void;
  onToggleRoleFilter: (role: string) => void;
  onToggleModelFilter: (model: string) => void;
  onResetFilters: () => void;
}

export const AdminAgentsTab: React.FC<AdminAgentsTabProps> = ({
  agents,
  isLoadingAgents,
  projectTypes,
  searchQuery,
  setSearchQuery,
  selectedProjectTypeFilters,
  selectedRoleFilters,
  selectedModelFilters,
  sortBy,
  sortOrder,
  setSortBy,
  setSortOrder,
  isFiltersOpen,
  setIsFiltersOpen,
  onCreateAgent,
  onEditAgent,
  onDeleteAgent,
  onToggleProjectTypeFilter,
  onToggleRoleFilter,
  onToggleModelFilter,
  onResetFilters,
}) => {
  // Filter and sort agents
  const filteredAndSortedAgents = useMemo(() => {
    let filtered = [...agents];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(agent =>
        agent.name.toLowerCase().includes(query) ||
        (agent.description && agent.description.toLowerCase().includes(query))
      );
    }

    // Filter by project types
    if (selectedProjectTypeFilters.length > 0) {
      filtered = filtered.filter(agent => {
        const agentProjectTypeIds = agent.projectTypes?.map(pt => pt.id) || [];
        return selectedProjectTypeFilters.some(filterId =>
          agentProjectTypeIds.includes(filterId)
        );
      });
    }

    // Filter by roles
    if (selectedRoleFilters.length > 0) {
      filtered = filtered.filter(agent => {
        if (selectedRoleFilters.includes('none') && !agent.role) return true;
        return agent.role && selectedRoleFilters.includes(agent.role);
      });
    }

    // Filter by models
    if (selectedModelFilters.length > 0) {
      filtered = filtered.filter(agent => {
        return agent.model && selectedModelFilters.includes(agent.model);
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'createdAt') {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        comparison = dateB - dateA;
      } else if (sortBy === 'projectTypesCount') {
        const countA = a.projectTypes?.length || 0;
        const countB = b.projectTypes?.length || 0;
        comparison = countB - countA;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [agents, searchQuery, selectedProjectTypeFilters, selectedRoleFilters, selectedModelFilters, sortBy, sortOrder]);

  // Count active filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedProjectTypeFilters.length > 0) count++;
    if (selectedRoleFilters.length > 0) count++;
    if (selectedModelFilters.length > 0) count++;
    return count;
  }, [searchQuery, selectedProjectTypeFilters, selectedRoleFilters, selectedModelFilters]);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 sm:mb-4 gap-2 sm:gap-2">
        <h2 className="text-base sm:text-lg font-bold text-white">Агенты-шаблоны</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Compact Sort Controls */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] sm:text-xs text-white/60 font-medium">Сортировка:</span>
            <div className="flex items-center gap-1 flex-wrap">
              {/* Name Sort */}
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => {
                    setSortBy('name');
                    setSortOrder('asc');
                    setIsFiltersOpen(false);
                  }}
                  className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium transition-all ${sortBy === 'name' && sortOrder === 'asc'
                      ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50'
                      : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                    }`}
                  title="По имени A-Z"
                >
                  <span className="hidden sm:inline">Имя</span>
                  <span className="sm:hidden">И</span>
                  <ArrowUp size={10} className="inline ml-0.5" />
                </button>
                <button
                  onClick={() => {
                    setSortBy('name');
                    setSortOrder('desc');
                    setIsFiltersOpen(false);
                  }}
                  className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium transition-all ${sortBy === 'name' && sortOrder === 'desc'
                      ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50'
                      : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                    }`}
                  title="По имени Z-A"
                >
                  <ArrowDown size={10} className="inline" />
                </button>
              </div>

              {/* Date Sort */}
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => {
                    setSortBy('createdAt');
                    setSortOrder('desc');
                    setIsFiltersOpen(false);
                  }}
                  className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium transition-all ${sortBy === 'createdAt' && sortOrder === 'desc'
                      ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50'
                      : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                    }`}
                  title="Новые сначала"
                >
                  <span className="hidden sm:inline">Дата</span>
                  <span className="sm:hidden">Д</span>
                  <ArrowDown size={10} className="inline ml-0.5" />
                </button>
                <button
                  onClick={() => {
                    setSortBy('createdAt');
                    setSortOrder('asc');
                    setIsFiltersOpen(false);
                  }}
                  className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium transition-all ${sortBy === 'createdAt' && sortOrder === 'asc'
                      ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50'
                      : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                    }`}
                  title="Старые сначала"
                >
                  <ArrowUp size={10} className="inline" />
                </button>
              </div>

              {/* Project Types Count Sort */}
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => {
                    setSortBy('projectTypesCount');
                    setSortOrder('desc');
                    setIsFiltersOpen(false);
                  }}
                  className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium transition-all ${sortBy === 'projectTypesCount' && sortOrder === 'desc'
                      ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50'
                      : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                    }`}
                  title="Больше типов"
                >
                  <span className="hidden sm:inline">Типы</span>
                  <span className="sm:hidden">Т</span>
                  <ArrowDown size={10} className="inline ml-0.5" />
                </button>
                <button
                  onClick={() => {
                    setSortBy('projectTypesCount');
                    setSortOrder('asc');
                    setIsFiltersOpen(false);
                  }}
                  className={`px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-medium transition-all ${sortBy === 'projectTypesCount' && sortOrder === 'asc'
                      ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50'
                      : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                    }`}
                  title="Меньше типов"
                >
                  <ArrowUp size={10} className="inline" />
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={onCreateAgent}
            className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1 sm:gap-2"
          >
            <Plus size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Создать агента</span>
            <span className="sm:hidden">Создать</span>
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="mb-3 sm:mb-4">
        <button
          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white transition-colors flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Filter size={16} className="sm:w-5 sm:h-5" />
            <span className="text-xs sm:text-sm font-medium">Фильтры</span>
            {activeFiltersCount > 0 && (
              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] sm:text-xs rounded-full border border-indigo-500/30 font-semibold">
                {activeFiltersCount}
              </span>
            )}
          </div>
          <ChevronDown
            size={16}
            className={`sm:w-5 sm:h-5 transition-transform duration-200 ${isFiltersOpen ? 'rotate-180' : ''
              }`}
          />
        </button>

        {/* Filters Content */}
        {isFiltersOpen && (
          <div className="mt-2 p-2.5 sm:p-3 bg-white/5 border border-white/10 rounded-lg space-y-3">
            {/* Search */}
            <div>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по имени или описанию..."
                  className="w-full pl-9 pr-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs sm:text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent"
                />
              </div>
            </div>

            {/* Project Types Filter */}
            <div>
              <label className="block text-[10px] sm:text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wider">
                Типы проектов
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {projectTypes.length === 0 ? (
                  <p className="text-[10px] text-white/40">Нет типов</p>
                ) : (
                  projectTypes.map((type) => {
                    const isSelected = selectedProjectTypeFilters.includes(type.id);
                    return (
                      <button
                        key={type.id}
                        onClick={() => onToggleProjectTypeFilter(type.id)}
                        className={`px-2 py-1 rounded-md text-[10px] sm:text-xs font-medium transition-all ${isSelected
                            ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50 shadow-sm shadow-indigo-500/20'
                            : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:border-white/20'
                          }`}
                      >
                        {type.name}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Roles Filter */}
            <div>
              <label className="block text-[10px] sm:text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wider">
                Роли
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: 'copywriter', label: 'Копирайтер' },
                  { value: 'layout', label: 'Верстальщик' },
                  { value: 'dsl', label: 'DSL' },
                  { value: 'none', label: 'Без роли' },
                ].map((role) => {
                  const isSelected = selectedRoleFilters.includes(role.value);
                  return (
                    <button
                      key={role.value}
                      onClick={() => onToggleRoleFilter(role.value)}
                      className={`px-2 py-1 rounded-md text-[10px] sm:text-xs font-medium transition-all ${isSelected
                          ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50 shadow-sm shadow-indigo-500/20'
                          : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:border-white/20'
                        }`}
                    >
                      {role.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Models Filter */}
            <div>
              <label className="block text-[10px] sm:text-xs font-medium text-white/60 mb-1.5 uppercase tracking-wider">
                Модели
              </label>
              <div className="flex flex-wrap gap-1.5">
                {MODELS.map((model) => {
                  const isSelected = selectedModelFilters.includes(model.id);
                  return (
                    <button
                      key={model.id}
                      onClick={() => onToggleModelFilter(model.id)}
                      className={`px-2 py-1 rounded-md text-[10px] sm:text-xs font-medium transition-all ${isSelected
                          ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50 shadow-sm shadow-indigo-500/20'
                          : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10 hover:border-white/20'
                        }`}
                    >
                      {model.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reset Button */}
            {activeFiltersCount > 0 && (
              <button
                onClick={onResetFilters}
                className="w-full px-2.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] sm:text-xs text-white/80 transition-colors flex items-center justify-center gap-1.5"
              >
                <X size={12} />
                Сбросить фильтры ({activeFiltersCount})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results Counter */}
      {!isLoadingAgents && agents.length > 0 && (
        <div className="mb-2 text-xs sm:text-sm text-white/60">
          Показано {filteredAndSortedAgents.length} из {agents.length} агентов
        </div>
      )}

      {isLoadingAgents ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-2">
          {agents.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-sm sm:text-base text-white/60">
              Нет агентов. Создайте первого агента.
            </div>
          ) : filteredAndSortedAgents.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-sm sm:text-base text-white/60">
              Нет агентов, соответствующих фильтрам.
            </div>
          ) : (
            filteredAndSortedAgents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => onEditAgent(agent)}
                className="group relative p-3 sm:p-3.5 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 hover:border-white/20 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-200 cursor-pointer"
              >
                {/* Верхний правый угол: дата и кнопка удаления */}
                <div className="absolute top-2 right-2 flex items-center gap-2 z-10">
                  {/* Дата создания */}
                  {agent.createdAt && (
                    <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-white/50">
                      <Calendar size={9} className="text-white/30 shrink-0" />
                      <span>{formatDate(agent.createdAt)}</span>
                    </div>
                  )}
                  {/* Кнопка удаления */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteAgent(agent.id, agent.name);
                    }}
                    className="p-1 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Удалить"
                  >
                    <Trash2 size={12} className="sm:w-3.5 sm:h-3.5" />
                  </button>
                </div>

                <div className="flex-1 min-w-0 pr-16">
                  {/* Заголовок с иконкой */}
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                    {getAgentIcon(agent.id, 14, 'sm:w-4 sm:h-4')}
                    <h3 className="text-xs sm:text-sm text-white font-semibold truncate">{agent.name}</h3>
                  </div>

                  {/* Описание */}
                  {agent.description && (
                    <p className="text-[10px] sm:text-xs text-white/60 mb-2.5 line-clamp-2 leading-tight">
                      {agent.description}
                    </p>
                  )}

                  {/* Теги проектов */}
                  {agent.projectTypes && agent.projectTypes.length > 0 && (
                    <div className="flex items-center flex-wrap gap-1.5 mt-2">
                      {agent.projectTypes.map((pt) => (
                        <span
                          key={pt.id}
                          className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 text-[9px] sm:text-[10px] rounded-full border border-indigo-500/30 font-medium"
                        >
                          {pt.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
};
