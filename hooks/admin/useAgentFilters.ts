import { useState, useEffect } from 'react';

const FILTERS_STORAGE_KEY = 'admin_agents_filters';

export const useAgentFilters = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectTypeFilters, setSelectedProjectTypeFilters] = useState<string[]>([]);
  const [selectedRoleFilters, setSelectedRoleFilters] = useState<string[]>([]);
  const [selectedModelFilters, setSelectedModelFilters] = useState<string[]>([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Загружаем фильтры из localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(FILTERS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSearchQuery(parsed.searchQuery || '');
        setSelectedProjectTypeFilters(parsed.selectedProjectTypeFilters || []);
        setSelectedRoleFilters(parsed.selectedRoleFilters || []);
        setSelectedModelFilters(parsed.selectedModelFilters || []);
      }
    } catch (error) {
      console.error('Failed to load filters from localStorage', error);
    }
  }, []);

  // Сохраняем фильтры в localStorage
  useEffect(() => {
    try {
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify({
        searchQuery,
        selectedProjectTypeFilters,
        selectedRoleFilters,
        selectedModelFilters,
      }));
    } catch (error) {
      console.error('Failed to save filters to localStorage', error);
    }
  }, [searchQuery, selectedProjectTypeFilters, selectedRoleFilters, selectedModelFilters]);

  const toggleProjectTypeFilter = (projectTypeId: string) => {
    setSelectedProjectTypeFilters(prev =>
      prev.includes(projectTypeId)
        ? prev.filter(id => id !== projectTypeId)
        : [...prev, projectTypeId]
    );
  };

  const toggleRoleFilter = (role: string) => {
    setSelectedRoleFilters(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const toggleModelFilter = (model: string) => {
    setSelectedModelFilters(prev =>
      prev.includes(model)
        ? prev.filter(m => m !== model)
        : [...prev, model]
    );
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedProjectTypeFilters([]);
    setSelectedRoleFilters([]);
    setSelectedModelFilters([]);
  };

  return {
    searchQuery,
    setSearchQuery,
    selectedProjectTypeFilters,
    selectedRoleFilters,
    selectedModelFilters,
    isFiltersOpen,
    setIsFiltersOpen,
    toggleProjectTypeFilter,
    toggleRoleFilter,
    toggleModelFilter,
    resetFilters,
  };
};

