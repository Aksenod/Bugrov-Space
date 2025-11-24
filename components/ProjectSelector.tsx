import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Edit2, Briefcase } from 'lucide-react';
import { Project } from '../types';

interface ProjectSelectorProps {
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (projectId: string) => void;
  onCreateProject: () => void;
  onEditProject: (project: Project) => void;
}

export const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  projects,
  activeProject,
  onSelectProject,
  onCreateProject,
  onEditProject,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Main Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 hover:border-white/20 transition-all group"
      >
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-lg shadow-[0_0_10px_rgba(99,102,241,0.3)]">
          <Briefcase size={16} className="text-white" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="text-[9px] font-bold text-indigo-300/90 uppercase tracking-widest mb-0.5">
            Project
          </div>
          <h1 className="font-bold text-white tracking-tight truncate text-xs leading-tight">
            {activeProject?.name || 'Выберите проект'}
          </h1>
          {activeProject?.projectType && (
            <div className="text-[10px] text-white/40 mt-0.5">
              {activeProject.projectType.name}
            </div>
          )}
        </div>
        <ChevronDown 
          size={16} 
          className={`text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto">
          <div className="p-2 space-y-1">
            {projects.map((project) => (
              <div
                key={project.id}
                className="group relative flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                onClick={() => {
                  onSelectProject(project.id);
                  setIsOpen(false);
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold text-xs truncate ${
                    activeProject?.id === project.id ? 'text-white' : 'text-white/90'
                  }`}>
                    {project.name}
                  </div>
                  {project.projectType && (
                    <div className="text-[10px] text-white/40 mt-0.5">
                      {project.projectType.name}
                    </div>
                  )}
                </div>
                {activeProject?.id === project.id && (
                  <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditProject(project);
                    setIsOpen(false);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-white/60 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                  title="Редактировать"
                >
                  <Edit2 size={14} />
                </button>
              </div>
            ))}
            
            <button
              onClick={() => {
                onCreateProject();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-white/10 border-dashed hover:border-indigo-400/50 hover:bg-indigo-500/10 text-white/50 hover:text-indigo-300 transition-all group mt-2"
            >
              <div className="p-1.5 rounded-lg bg-white/5 group-hover:bg-indigo-500/20 transition-colors">
                <Plus size={16} />
              </div>
              <span className="font-semibold text-xs">Создать проект</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
