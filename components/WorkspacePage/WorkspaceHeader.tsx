/**
 * Компонент заголовка рабочего пространства
 */

import React from 'react';
import { Settings, Trash2, Menu } from 'lucide-react';
import { Agent } from '../../types';
import { LLMModel, MODELS } from '../../types';
import { Brain, Zap, Cpu } from 'lucide-react';

interface WorkspaceHeaderProps {
  activeAgent: Agent;
  isAdmin: boolean;
  activeAgentId: string | null;
  onSidebarToggle: () => void;
  onClearChat: () => Promise<void>;
  onOpenAdmin: (agentId?: string | null) => void;
}

export const WorkspaceHeader: React.FC<WorkspaceHeaderProps> = ({
  activeAgent,
  isAdmin,
  activeAgentId,
  onSidebarToggle,
  onClearChat,
  onOpenAdmin,
}) => {
  const resolvedModel = (activeAgent?.model as LLMModel) || LLMModel.GPT5_MINI;
  const isMiniModel = resolvedModel === LLMModel.GPT4O_MINI;
  const isUltraModel = resolvedModel === LLMModel.GPT51;
  const isGPT5Mini = false;
  const modelBadgeClass = isUltraModel
    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
    : isGPT5Mini
      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
      : isMiniModel
        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
        : 'bg-pink-500/10 border-pink-500/30 text-pink-400';
  const ModelBadgeIcon = isUltraModel ? Brain : isMiniModel ? Zap : Cpu;
  const modelBadgeLabel =
    MODELS.find((m) => m.id === resolvedModel)?.name ?? 'GPT-5.1';

  return (
    <header className="flex-shrink-0 min-h-[4.5rem] sm:min-h-[4rem] m-2 bg-gradient-to-r from-black/85 via-black/75 to-black/85 backdrop-blur-xl border border-white/20 rounded-[1.5rem] shadow-2xl shadow-black/50 shadow-indigo-500/10 flex items-center justify-between pl-4 sm:pl-6 pr-2 sm:pr-3 z-30 py-2.5 sm:py-2">
      <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
        <button
          onClick={onSidebarToggle}
          className="md:hidden p-2.5 -ml-2 text-white/60 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:ring-offset-2 focus:ring-offset-black rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center transition-all hover:bg-white/5"
        >
          <Menu size={20} />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap">
            <h2 className="font-bold text-lg sm:text-xl tracking-tight text-white truncate max-w-[200px] sm:max-w-xs md:max-w-sm leading-tight">
              {activeAgent.name}
            </h2>

            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border transition-all duration-300 shadow-sm flex-shrink-0 ${modelBadgeClass}`}>
              <ModelBadgeIcon size={12} className={isUltraModel ? 'text-emerald-300' : isGPT5Mini ? 'text-emerald-400' : isMiniModel ? 'text-amber-400' : 'text-pink-400'} />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {modelBadgeLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        {isAdmin && (
          <button
            onClick={() => onOpenAdmin(activeAgentId)}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:ring-offset-2 focus:ring-offset-black min-w-[44px] min-h-[44px] flex items-center justify-center hover:shadow-sm hover:bg-white/15"
            title="Настройки агентов"
          >
            <Settings size={17} />
          </button>
        )}
        <button
          onClick={onClearChat}
          className="p-2.5 text-white/40 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-red-500/70 focus:ring-offset-2 focus:ring-offset-black min-w-[44px] min-h-[44px] flex items-center justify-center hover:shadow-sm"
          title="Clear Chat"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </header>
  );
};

