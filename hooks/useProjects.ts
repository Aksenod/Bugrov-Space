/**
 * Хук для управления проектами
 */

import { useState, useCallback, useMemo } from 'react';
import { getProjects as getProjectsService, createProject as createProjectService, updateProject as updateProjectService, deleteProject as deleteProjectService } from '../services/projectService';
import { api } from '../services/api'; // Для getProjectTypes пока оставляем старый api
import { mapProject } from '../utils/mappers';
import { UseProjectsReturn } from './types';
import { Project, ProjectType } from '../types';

/**
 * Хук для управления проектами пользователя
 * 
 * Предоставляет методы для:
 * - Создания проекта (createProject)
 * - Обновления проекта (updateProject)
 * - Удаления проекта (deleteProject)
 * - Выбора активного проекта (selectProject)
 * - Получения проекта по ID (getProject)
 * - Управления типами проектов
 */
export const useProjects = (): UseProjectsReturn => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    // Восстанавливаем активный проект из localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lastUsedProjectId');
    }
    return null;
  });
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Получает проект по ID
   */
  const getProject = useCallback((projectId: string): Project | undefined => {
    return projects.find(p => p.id === projectId);
  }, [projects]);

  /**
   * Загружает проекты с сервера
   */
  const loadProjects = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const { projects: apiProjects } = await getProjectsService();
      const mappedProjects = apiProjects.map(mapProject);
      setProjects(mappedProjects);

      // Восстанавливаем активный проект или выбираем первый
      const lastUsedProjectId = localStorage.getItem('lastUsedProjectId');
      const projectToSelect = lastUsedProjectId && mappedProjects.find(p => p.id === lastUsedProjectId)
        ? lastUsedProjectId
        : mappedProjects[0]?.id ?? null;

      if (projectToSelect) {
        setActiveProjectId(projectToSelect);
        localStorage.setItem('lastUsedProjectId', projectToSelect);
      } else {
        setActiveProjectId(null);
      }
    } catch (error) {
      console.error('Failed to load projects', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Загружает типы проектов
   */
  const loadProjectTypes = useCallback(async (): Promise<void> => {
    try {
      const { projectTypes: apiProjectTypes } = await api.getProjectTypes().catch(() => ({ projectTypes: [] }));
      const mappedProjectTypes = apiProjectTypes.map((t: any) => ({
        id: t.id,
        name: t.name,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      }));
      setProjectTypes(mappedProjectTypes);
    } catch (error) {
      console.error('Failed to load project types', error);
      // Не бросаем ошибку, просто оставляем пустой массив
      setProjectTypes([]);
    }
  }, []);

  /**
   * Создает новый проект
   */
  const createProject = useCallback(async (
    name: string,
    projectTypeId: string,
    description?: string
  ): Promise<Project> => {
    setIsLoading(true);
    try {
      const { project } = await createProjectService({ name, projectTypeId, description });
      const mappedProject = mapProject(project);
      setProjects((prev) => [...prev, mappedProject]);
      setActiveProjectId(mappedProject.id);
      localStorage.setItem('lastUsedProjectId', mappedProject.id);
      return mappedProject;
    } catch (error) {
      console.error('Failed to create project', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Обновляет проект
   */
  const updateProject = useCallback(async (
    projectId: string,
    name?: string,
    description?: string
  ): Promise<void> => {
    setIsLoading(true);
    try {
      const { project } = await updateProjectService(projectId, { name, description });
      const mappedProject = mapProject(project);
      setProjects((prev) => prev.map(p => p.id === mappedProject.id ? mappedProject : p));
    } catch (error) {
      console.error('Failed to update project', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Удаляет проект
   */
  const deleteProject = useCallback(async (projectId: string): Promise<void> => {
    setIsLoading(true);
    try {
      await deleteProjectService(projectId);
      
      // Удаляем проект из списка
      setProjects((prev) => {
        const updated = prev.filter(p => p.id !== projectId);
        
        // Если удаленный проект был активным, выбираем другой или очищаем
        if (activeProjectId === projectId) {
          if (updated.length > 0) {
            const nextProject = updated[0];
            setActiveProjectId(nextProject.id);
            localStorage.setItem('lastUsedProjectId', nextProject.id);
          } else {
            setActiveProjectId(null);
            localStorage.removeItem('lastUsedProjectId');
          }
        }
        
        return updated;
      });
    } catch (error) {
      console.error('Failed to delete project', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [activeProjectId]);

  /**
   * Выбирает активный проект
   */
  const selectProject = useCallback((projectId: string | null): void => {
    setActiveProjectId(projectId);
    if (projectId) {
      localStorage.setItem('lastUsedProjectId', projectId);
    } else {
      localStorage.removeItem('lastUsedProjectId');
    }
  }, []);

  return {
    projects,
    activeProjectId,
    projectTypes,
    isLoading,
    createProject,
    updateProject,
    deleteProject,
    selectProject,
    getProject,
    // Внутренние методы для использования в bootstrap
    loadProjects,
    loadProjectTypes,
    setProjects,
    setProjectTypes,
  };
};

