import React from 'react';
import { Bot, Brain, Cpu, Zap, Rocket, Sparkles, CircuitBoard, Wand2 } from 'lucide-react';
import { LLMModel } from '../../types';

export const formatDate = (dateString?: string): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };

    if (diffDays === 0) {
      return `Сегодня, ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Вчера, ${date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleString('ru-RU', options);
    }
  } catch {
    return '';
  }
};

export const getAgentIcon = (agentId: string, size: number = 16, className: string = '') => {
  const hash = Array.from(agentId).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const iconIndex = hash % 8;

  const iconProps = { size, className: `text-indigo-400 shrink-0 ${className}` };

  const icons = [
    <Bot key="bot" {...iconProps} />,
    <Brain key="brain" {...iconProps} />,
    <Cpu key="cpu" {...iconProps} />,
    <Zap key="zap" {...iconProps} />,
    <Rocket key="rocket" {...iconProps} />,
    <Sparkles key="sparkles" {...iconProps} />,
    <CircuitBoard key="circuit" {...iconProps} />,
    <Wand2 key="wand" {...iconProps} />,
  ];

  return icons[iconIndex];
};

export const resolveModel = (value: string): LLMModel => {
  if (value === LLMModel.GPT51) return LLMModel.GPT51;
  if (value === LLMModel.GPT4O) return LLMModel.GPT4O;
  if (value === LLMModel.GPT4O_MINI) return LLMModel.GPT4O_MINI;
  return LLMModel.GPT51;
};
