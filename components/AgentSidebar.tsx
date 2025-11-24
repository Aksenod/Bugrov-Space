import React from 'react';
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
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Agent, User, Project } from '../types';
import { Bot, FileText, PenTool, Hash, Briefcase, Plus, FolderOpen, Save, CheckCircle, Loader2, LogOut, User as UserIcon, Trash2, Settings } from 'lucide-react';
import { ProjectSelector } from './ProjectSelector';

interface AgentSidebarProps {
  projects: Project[];
  activeProject: Project | null;
  agents: Agent[];
  projectTypeAgents: Agent[];
  activeAgentId: string;
  onSelectAgent: (id: string) => void;
  onSelectProject: (projectId: string) => void;
  onCreateProject: () => void;
  onEditProject: (project: Project) => void;
  onAddAgent: () => void;
  onDeleteAgent: (id: string) => void;
  onReorderAgents: (agentIds: string[]) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
  onOpenDocs: () => void;
  onGenerateSummary: () => void;
  isGeneratingSummary: boolean;
  summarySuccess: boolean;
  currentUser: User | null;
  onLogout: () => void;
  onOpenAdmin?: () => void;
  documentsCount?: number;
}

export const AgentSidebar: React.FC<AgentSidebarProps> = ({
  projects,
  activeProject,
  agents,
  projectTypeAgents,
  activeAgentId,
  onSelectAgent,
  onSelectProject,
  onCreateProject,
  onEditProject,
  onAddAgent,
  onDeleteAgent,
  onReorderAgents,
  isOpen,
  onCloseMobile,
  onOpenDocs,
  onGenerateSummary,
  isGeneratingSummary,
  summarySuccess,
  currentUser,
  onLogout,
  onOpenAdmin,
  documentsCount = 0
}) => {
  
  // Проверка, является ли пользователь администратором
  const isAdmin = currentUser && (currentUser.username === 'admin' || currentUser.role === 'admin');
  
  const getIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('резюм') || lower.includes('sum')) return <CheckCircle size={16} />;
    if (lower.includes('документ') || lower.includes('document')) return <FileText size={16} />;
    if (lower.includes('творч') || lower.includes('writer') || lower.includes('копирайтер')) return <PenTool size={16} />;
    if (lower.includes('assist') || lower.includes('помощник')) return <Bot size={16} />;
    return <Hash size={16} />;
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    // Обычные пользователи не могут перемещать агентов
    if (!isAdmin) return;
    
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Перемещение только для обычных агентов проекта (не для агентов типа проекта)
    const oldIndex = agents.findIndex((agent) => agent.id === active.id);
    const newIndex = agents.findIndex((agent) => agent.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(agents, oldIndex, newIndex).map((agent) => agent.id);
    onReorderAgents(newOrder);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-md"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed inset-y-2 left-2 z-40 w-64 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-[1.5rem] shadow-2xl transform transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] md:relative md:translate-x-0 md:inset-y-auto md:h-auto md:m-2 md:mr-0 flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-[120%]'
        }`}
      >
        {/* Project Header */}
        <div className="p-4 border-b border-white/5">
          <ProjectSelector
            projects={projects}
            activeProject={activeProject}
            onSelectProject={onSelectProject}
            onCreateProject={onCreateProject}
            onEditProject={onEditProject}
          />
        </div>

        {/* Agent List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 no-scrollbar">
          {/* Агенты типа проекта */}
          {projectTypeAgents.length > 0 && (
            <>
              <div className="px-2 py-2 mb-0.5">
                <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">
                  Агенты типа проекта
                </span>
              </div>
              {projectTypeAgents.map((agent) => (
                <div
                  key={agent.id}
                  onClick={() => {
                    onSelectAgent(agent.id);
                    onCloseMobile();
                  }}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all group ${
                    agent.id === activeAgentId
                      ? 'bg-indigo-500/20 border border-indigo-400/50 text-white'
                      : 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/70 hover:text-white'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg ${
                    agent.id === activeAgentId
                      ? 'bg-indigo-500/30'
                      : 'bg-white/5 group-hover:bg-indigo-500/20'
                  } transition-colors`}>
                    {getIcon(agent.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-xs truncate">{agent.name}</div>
                  </div>
                </div>
              ))}
              <div className="h-2" /> {/* Разделитель */}
            </>
          )}
          
          {/* Обычные агенты проекта */}
          <div className="px-2 py-2 mb-0.5">
            <span className="text-[9px] font-bold text-white/60 uppercase tracking-widest">
              Agents
            </span>
          </div>
          
          {isAdmin ? (
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
              <SortableContext items={agents.map(agent => agent.id)} strategy={verticalListSortingStrategy}>
                {agents.map((agent) => (
                  <SortableAgentItem
                    key={agent.id}
                    agent={agent}
                    isActive={agent.id === activeAgentId}
                    canDelete={agents.length > 1 && (!agent.role || agent.role.trim() === '')}
                    onSelectAgent={() => {
                        onSelectAgent(agent.id);
                        onCloseMobile();
                      }}
                    onDeleteAgent={() => onDeleteAgent(agent.id)}
                    getIcon={getIcon}
                  />
                ))}
              </SortableContext>
            </DndContext>
          ) : (
            // Для обычных пользователей - без drag-and-drop
            agents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => {
                  onSelectAgent(agent.id);
                  onCloseMobile();
                }}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all group ${
                  agent.id === activeAgentId
                    ? 'bg-indigo-500/20 border border-indigo-400/50 text-white'
                    : 'bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/70 hover:text-white'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${
                  agent.id === activeAgentId
                    ? 'bg-indigo-500/30'
                    : 'bg-white/5 group-hover:bg-indigo-500/20'
                } transition-colors`}>
                  {getIcon(agent.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs truncate">{agent.name}</div>
                </div>
              </div>
            ))
          )}

          {/* Add Agent Button - только для администраторов */}
          {isAdmin && (
            <button
              onClick={onAddAgent}
              className="w-full flex items-center gap-3 p-2.5 mt-3 rounded-xl border border-white/10 border-dashed hover:border-indigo-400/50 hover:bg-indigo-500/10 text-white/40 hover:text-indigo-300 transition-all group"
            >
              <div className="p-1.5 rounded-lg bg-white/5 group-hover:bg-indigo-500/20 transition-colors">
                 <Plus size={16} />
              </div>
              <span className="font-medium text-xs">Add Agent</span>
            </button>
          )}
        </div>

        {/* Project Space & User Section */}
        <div className="flex-shrink-0 flex flex-col gap-1 p-2 border-t border-white/5 bg-white/[0.02]">
             
             {/* Documents */}
             <div className="relative group">
               <button
                 onClick={() => {
                    onOpenDocs();
                    onCloseMobile();
                 }}
                 className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/5 transition-all group-hover:border-white/10"
               >
                 <div className="relative p-1.5 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 transition-colors">
                    <FolderOpen size={16} />
                    {documentsCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 bg-amber-500 text-white text-[10px] font-bold rounded-full border-2 border-black/60 shadow-lg">
                        {documentsCount > 99 ? '99+' : documentsCount}
                      </span>
                    )}
                 </div>
                 <span className="font-medium text-xs">Documents</span>
               </button>
               
               {/* Embedded Save Button */}
               <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <button
                     onClick={(e) => {
                         e.stopPropagation();
                         onGenerateSummary();
                     }}
                     disabled={isGeneratingSummary}
                     className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all duration-300 border ${
                        summarySuccess 
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : isGeneratingSummary
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                            : 'bg-white/5 hover:bg-indigo-500 text-white/40 hover:text-white border-transparent hover:border-indigo-400/30'
                     }`}
                     title="Save Chat to Documents"
                  >
                     {summarySuccess ? (
                        <CheckCircle size={12} />
                     ) : isGeneratingSummary ? (
                        <Loader2 size={12} className="animate-spin" />
                     ) : (
                        <Save size={12} />
                     )}
                     <span className="hidden sm:inline">
                        {summarySuccess ? 'Saved' : isGeneratingSummary ? 'Saving...' : 'Save'}
                     </span>
                  </button>
               </div>
             </div>

             {/* User Profile / Logout */}
             {currentUser && (
                <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between px-2 pb-1">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white shadow-lg text-xs font-bold">
                       {currentUser.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-col flex">
                       <span className="text-xs font-bold text-white truncate">{currentUser.username}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    {onOpenAdmin && isAdmin && (
                      <button 
                        onClick={() => {
                          onOpenAdmin();
                          onCloseMobile();
                        }}
                        className="p-2 rounded-lg text-white/30 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                        title="Администратор"
                      >
                        <Settings size={16} />
                      </button>
                    )}
                    
                    <button 
                      onClick={onLogout}
                      className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title="Выйти"
                    >
                      <LogOut size={16} />
                    </button>
                  </div>
                </div>
             )}
        </div>

      </aside>
    </>
  );
};

interface SortableAgentItemProps {
  agent: Agent;
  isActive: boolean;
  canDelete: boolean;
  onSelectAgent: () => void;
  onDeleteAgent: () => void;
  getIcon: (name: string) => React.ReactNode;
}

const SortableAgentItem: React.FC<SortableAgentItemProps> = ({
  agent,
  isActive,
  canDelete,
  onSelectAgent,
  onDeleteAgent,
  getIcon,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: agent.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    cursor: 'grab',
  } as React.CSSProperties;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group/item ${isDragging ? 'z-20' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        onClick={onSelectAgent}
        className={`w-full flex items-center gap-3 p-2.5 pr-10 rounded-xl transition-all duration-300 group relative overflow-hidden ${
          isActive
            ? 'bg-white/10 text-white shadow-[0_4px_15px_rgba(0,0,0,0.2)] border border-white/10'
            : 'hover:bg-white/5 text-white/50 hover:text-white border border-transparent'
        } ${isDragging ? 'opacity-80' : ''}`}
      >
        {isActive && (
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-50" />
        )}

        <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-white/10 text-white shadow-inner' : 'bg-transparent'}`}>
          {getIcon(agent.name)}
        </div>

        <div className="flex-1 min-w-0 relative z-10 text-left">
          <h3 className="font-medium text-xs truncate">
            {agent.name}
          </h3>
        </div>

        {isActive && <div className="w-1 h-1 rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,1)] mr-1"></div>}
      </button>

      {canDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteAgent();
          }}
          className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all z-20 ${
            isActive
              ? 'text-white/30 hover:text-red-400 hover:bg-red-500/20 opacity-0 group-hover/item:opacity-100'
              : 'text-white/20 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover/item:opacity-100'
          }`}
          title="Delete Agent"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
};