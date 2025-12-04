import { useState, useEffect } from 'react';

const SORT_STORAGE_KEY = 'admin_agents_sort';

export type SortBy = 'name' | 'createdAt' | 'projectTypesCount';
export type SortOrder = 'asc' | 'desc';

export const useAgentSort = () => {
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  // Загружаем сортировку из localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SORT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setSortBy(parsed.sortBy || 'name');
        setSortOrder(parsed.sortOrder || 'asc');
      }
    } catch (error) {
      console.error('Failed to load sort from localStorage', error);
    }
  }, []);

  // Сохраняем сортировку в localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify({
        sortBy,
        sortOrder,
      }));
    } catch (error) {
      console.error('Failed to save sort to localStorage', error);
    }
  }, [sortBy, sortOrder]);

  return {
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    isSortDropdownOpen,
    setIsSortDropdownOpen,
  };
};

