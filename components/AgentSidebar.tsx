import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Agent, User, Project } from '../types';
import { Bot, FileText, PenTool, Hash, FolderOpen, Save, CheckCircle, Loader2, LogOut, Settings, Brain, Cpu, Zap, Rocket, Sparkles, CircuitBoard, Wand2 } from 'lucide-react';
import { ProjectSelector } from './ProjectSelector';
import { OnboardingTooltip } from './OnboardingTooltip';
import { useOnboarding } from './OnboardingContext';

const ADMIN_USERNAMES = new Set(['admin', 'aksenod']);

interface AgentSidebarProps {
  projects: Project[];
  activeProject: Project | null;
  agents: Agent[];
  activeAgentId: string;
  onSelectAgent: (id: string) => void;
  onSelectProject: (projectId: string) => void;
  onCreateProject: () => void;
  onEditProject: (project: Project) => void;
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
  activeAgentId,
  onSelectAgent,
  onSelectProject,
  onCreateProject,
  onEditProject,
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
  const { shouldShowStep, completeStep, dismissStep } = useOnboarding();
  const [showDocumentsTooltip, setShowDocumentsTooltip] = useState(false);
  const [showSaveTooltip, setShowSaveTooltip] = useState(false);
  const documentsButtonRef = useRef<HTMLButtonElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  
  // Проверка, является ли пользователь администратором
  const isAdmin =
    !!currentUser &&
    (currentUser.role === 'admin' || (currentUser?.username && ADMIN_USERNAMES.has(currentUser.username)));
  
  // Показываем тултипы при первом рендере, если нужно
  useEffect(() => {
    if (activeProject && agents.length > 0 && isOpen) {
      const documentsStep = {
        id: 'documents-button-tooltip',
        component: 'tooltip' as const,
        target: '#documents-button',
        position: 'right' as const,
        content: {
          description: 'Документы проекта доступны всем агентам проекта.',
        },
        showOnce: true,
      };
      
      if (shouldShowStep(documentsStep)) {
        const timer = setTimeout(() => {
          if (documentsButtonRef.current) {
            setShowDocumentsTooltip(true);
          }
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [activeProject, agents.length, isOpen, shouldShowStep]);
  
  const getIcon = (name: string, agentId?: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('резюм') || lower.includes('sum')) return <CheckCircle size={16} />;
    if (lower.includes('документ') || lower.includes('document')) return <FileText size={16} />;
    if (lower.includes('творч') || lower.includes('writer') || lower.includes('копирайтер')) return <PenTool size={16} />;
    if (lower.includes('бери')) return <Hash size={16} />;
    
    // Для остальных - разнообразные иконки роботов на основе ID
    if (agentId) {
      const hash = Array.from(agentId).reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const iconIndex = hash % 8;
      const icons = [
        <Bot key="bot" size={16} />,
        <Brain key="brain" size={16} />,
        <Cpu key="cpu" size={16} />,
        <Zap key="zap" size={16} />,
        <Rocket key="rocket" size={16} />,
        <Sparkles key="sparkles" size={16} />,
        <CircuitBoard key="circuit" size={16} />,
        <Wand2 key="wand" size={16} />,
      ];
      return icons[iconIndex];
    }
    
    // Fallback для случаев без ID
    return <Bot size={16} />;
  };

  // Сортируем агентов по полю order для правильного отображения
  const sortedAgents = useMemo(() => {
    return [...agents].sort((a, b) => {
      const orderA = a.order ?? 0;
      const orderB = b.order ?? 0;
      if (orderA === orderB) {
        return a.id.localeCompare(b.id);
      }
      return orderA - orderB;
    });
  }, [agents]);

  useEffect(() => {
    if (activeProject && agents.length > 0 && isOpen) {
      const saveStep = {
        id: 'save-button-tooltip',
        component: 'tooltip' as const,
        target: '#save-button',
        position: 'left' as const,
        content: {
          description: 'Сохраняет текущий диалог в документы проекта.',
        },
        showOnce: true,
      };

      if (shouldShowStep(saveStep)) {
        const timer = setTimeout(() => {
          if (saveButtonRef.current) {
            setShowSaveTooltip(true);
          }
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [activeProject, agents.length, isOpen, shouldShowStep]);

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
          <div className="space-y-1.5 sm:space-y-2 mt-2">
            {sortedAgents.map((agent, index) => (
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
                } transition-colors relative`}>
                  {getIcon(agent.name, agent.id)}
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-medium text-white/80 bg-white/10 rounded-full border border-white/10 transition-all duration-300">
                    {(agent.order ?? 0) + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs truncate">{agent.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Project Space & User Section */}
        <div className="flex-shrink-0 flex flex-col gap-1 p-2 border-t border-white/5">
             
             {/* Documents */}
             <div className="relative group">
               <button
                 ref={documentsButtonRef}
                 id="documents-button"
                 onClick={() => {
                    onOpenDocs();
                    onCloseMobile();
                    if (shouldShowStep({
                      id: 'documents-button-tooltip',
                      component: 'tooltip',
                      target: '#documents-button',
                      position: 'right',
                      content: {
                        description: 'Документы проекта доступны всем агентам проекта.',
                      },
                      showOnce: true,
                    })) {
                      completeStep('documents-button-tooltip');
                    }
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
                     ref={saveButtonRef}
                     id="save-button"
                     onClick={(e) => {
                         e.stopPropagation();
                         onGenerateSummary();
                         if (shouldShowStep({
                           id: 'save-button-tooltip',
                           component: 'tooltip',
                           target: '#save-button',
                           position: 'left',
                           content: {
                             description: 'Сохраняет текущий диалог в документы проекта.',
                           },
                           showOnce: true,
                         })) {
                           completeStep('save-button-tooltip');
                         }
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
             
             {/* Tooltips */}
             {showDocumentsTooltip && shouldShowStep({
               id: 'documents-button-tooltip',
               component: 'tooltip',
               target: '#documents-button',
               position: 'right',
               content: {
                 title: 'Документы проекта',
                 description: 'Здесь вы можете загружать и просматривать документы проекта. Все агенты проекта имеют доступ к этим документам и используют их для контекста при ответах. Документы проекта отличаются от базы знаний агента — они общие для всех агентов проекта.',
                 examples: [
                   'Загрузите ТЗ, брендбук или примеры работ',
                   'Агенты будут использовать эти документы при ответах',
                   'Документы доступны всем агентам проекта',
                 ],
               },
               showOnce: true,
             }) && (
               <OnboardingTooltip
                 step={{
                   id: 'documents-button-tooltip',
                   component: 'tooltip',
                   target: '#documents-button',
                   position: 'right',
                   content: {
                     title: 'Документы проекта',
                     description: 'Здесь вы можете загружать и просматривать документы проекта. Все агенты проекта имеют доступ к этим документам и используют их для контекста при ответах. Документы проекта отличаются от базы знаний агента — они общие для всех агентов проекта.',
                     examples: [
                       'Загрузите ТЗ, брендбук или примеры работ',
                       'Агенты будут использовать эти документы при ответах',
                       'Документы доступны всем агентам проекта',
                     ],
                   },
                   showOnce: true,
                 }}
                 isVisible={showDocumentsTooltip}
                 onComplete={() => {
                   completeStep('documents-button-tooltip');
                   setShowDocumentsTooltip(false);
                 }}
                 onDismiss={() => {
                   dismissStep('documents-button-tooltip');
                   setShowDocumentsTooltip(false);
                 }}
               />
             )}
             
             {showSaveTooltip && shouldShowStep({
               id: 'save-button-tooltip',
               component: 'tooltip',
               target: '#save-button',
               position: 'left',
               content: {
                 title: 'Сохранить диалог',
                 description: 'Эта кнопка сохраняет текущий диалог с агентом в документы проекта. Сохраненный диалог будет доступен всем агентам проекта и может использоваться как справочная информация.',
                 examples: [
                   'Сохраните важные решения и обсуждения',
                   'Сохраненные диалоги доступны всем агентам',
                 ],
               },
               showOnce: true,
             }) && (
               <OnboardingTooltip
                 step={{
                   id: 'save-button-tooltip',
                   component: 'tooltip',
                   target: '#save-button',
                   position: 'left',
                   content: {
                     title: 'Сохранить диалог',
                     description: 'Эта кнопка сохраняет текущий диалог с агентом в документы проекта. Сохраненный диалог будет доступен всем агентам проекта и может использоваться как справочная информация.',
                     examples: [
                       'Сохраните важные решения и обсуждения',
                       'Сохраненные диалоги доступны всем агентам',
                     ],
                   },
                   showOnce: true,
                 }}
                 isVisible={showSaveTooltip}
                 onComplete={() => {
                   completeStep('save-button-tooltip');
                   setShowSaveTooltip(false);
                 }}
                 onDismiss={() => {
                   dismissStep('save-button-tooltip');
                   setShowSaveTooltip(false);
                 }}
               />
             )}

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
                          window.location.hash = '#/admin';
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
