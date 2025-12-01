import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { SortableAgentItemProps } from './types';
import { getAgentIcon } from './utils';

export const SortableAgentItem: React.FC<SortableAgentItemProps> = ({ agent, index }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: agent.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as React.CSSProperties;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors ${isDragging ? 'opacity-50 z-20' : ''
        }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-white/40 hover:text-white/60 transition-colors"
      >
        <GripVertical size={14} className="sm:w-4 sm:h-4" />
      </div>
      <span className="text-xs sm:text-sm text-white/50 font-medium w-6 sm:w-8 text-center">
        {index + 1}
      </span>
      {getAgentIcon(agent.id, 14, 'sm:w-4 sm:h-4')}
      <div className="flex-1 min-w-0">
        <div className="text-xs sm:text-sm text-white font-medium truncate">
          {agent.name}
        </div>
        {agent.description && (
          <div className="text-[10px] sm:text-xs text-white/60 truncate mt-0.5">
            {agent.description}
          </div>
        )}
      </div>
    </div>
  );
};
