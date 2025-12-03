import React, { useState, useEffect } from 'react';
import { User, FileText, Layout, Target, MessageSquare, TrendingUp, Zap, Brain, Sparkles, Code, Palette, BarChart, Search, PenTool, Video, Image, Globe } from 'lucide-react';
import { api, ApiPublicProjectType } from '../../services/api';

interface Agent {
  id: string;
  name: string;
  description: string;
  role?: string;
}

// Маппинг иконок по ключевым словам в названии/роли агента
const getIconForAgent = (name: string, role?: string): React.ComponentType<{ className?: string }> => {
  const lowerName = name.toLowerCase();
  const lowerRole = (role || '').toLowerCase();
  const combined = `${lowerName} ${lowerRole}`;

  if (combined.includes('сегмент') || combined.includes('аудитор')) return Target;
  if (combined.includes('persona') || combined.includes('персона')) return User;
  if (combined.includes('ux') || combined.includes('архитектор') || combined.includes('структур')) return Layout;
  if (combined.includes('копирайт') || combined.includes('текст') || combined.includes('писат')) return MessageSquare;
  if (combined.includes('стратег') || combined.includes('контент')) return TrendingUp;
  if (combined.includes('сценари') || combined.includes('видео') || combined.includes('рилс')) return Video;
  if (combined.includes('smm') || combined.includes('соцсет')) return Zap;
  if (combined.includes('аналит') || combined.includes('метрик')) return BarChart;
  if (combined.includes('дизайн') || combined.includes('ui')) return Palette;
  if (combined.includes('разработ') || combined.includes('код')) return Code;
  if (combined.includes('поиск') || combined.includes('research')) return Search;
  if (combined.includes('редакт') || combined.includes('редактор')) return PenTool;
  if (combined.includes('изображен') || combined.includes('график')) return Image;
  if (combined.includes('веб') || combined.includes('сайт')) return Globe;
  
  return Sparkles; // Дефолтная иконка
};

// Маппинг цветов по ролям/названиям
const getColorForAgent = (name: string, role?: string, index: number = 0): string => {
  const lowerName = name.toLowerCase();
  const lowerRole = (role || '').toLowerCase();
  const combined = `${lowerName} ${lowerRole}`;

  const colorMap: Record<string, string> = {
    'сегмент': 'indigo',
    'persona': 'purple',
    'ux': 'emerald',
    'архитектор': 'emerald',
    'копирайт': 'amber',
    'текст': 'amber',
    'стратег': 'rose',
    'контент': 'rose',
    'сценари': 'cyan',
    'smm': 'blue',
    'аналит': 'violet',
    'дизайн': 'pink',
    'разработ': 'orange',
  };

  for (const [key, color] of Object.entries(colorMap)) {
    if (combined.includes(key)) {
      return color;
    }
  }

  // Fallback: циклическое распределение цветов
  const colors = ['indigo', 'purple', 'emerald', 'amber', 'rose', 'cyan', 'blue', 'violet'];
  return colors[index % colors.length];
};

export const AgentsSection: React.FC = () => {
  const [projectTypes, setProjectTypes] = useState<ApiPublicProjectType[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProjectTypes = async () => {
      try {
        setIsLoading(true);
        const response = await api.getPublicProjectTypes();
        if (response.projectTypes && response.projectTypes.length > 0) {
          setProjectTypes(response.projectTypes);
          // Устанавливаем первый таб как активный по умолчанию
          setActiveTab(response.projectTypes[0].id);
        } else {
          setProjectTypes([]);
        }
      } catch (error: any) {
        // Логируем только ошибки в dev режиме
        if (import.meta.env.DEV) {
          console.error('[AgentsSection] Failed to load project types:', error);
        }
        // В случае ошибки оставляем пустой массив, но компонент все равно покажется
        setProjectTypes([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadProjectTypes();
  }, []);

  const colorClasses = {
    indigo: {
      iconBg: 'bg-indigo-500/10',
      iconBorder: 'border-indigo-500/20',
      iconColor: 'text-indigo-400',
      cardBorder: 'hover:border-indigo-500/30',
      cardShadow: 'hover:shadow-indigo-500/10',
    },
    purple: {
      iconBg: 'bg-purple-500/10',
      iconBorder: 'border-purple-500/20',
      iconColor: 'text-purple-400',
      cardBorder: 'hover:border-purple-500/30',
      cardShadow: 'hover:shadow-purple-500/10',
    },
    emerald: {
      iconBg: 'bg-emerald-500/10',
      iconBorder: 'border-emerald-500/20',
      iconColor: 'text-emerald-400',
      cardBorder: 'hover:border-emerald-500/30',
      cardShadow: 'hover:shadow-emerald-500/10',
    },
    amber: {
      iconBg: 'bg-amber-500/10',
      iconBorder: 'border-amber-500/20',
      iconColor: 'text-amber-400',
      cardBorder: 'hover:border-amber-500/30',
      cardShadow: 'hover:shadow-amber-500/10',
    },
    rose: {
      iconBg: 'bg-rose-500/10',
      iconBorder: 'border-rose-500/20',
      iconColor: 'text-rose-400',
      cardBorder: 'hover:border-rose-500/30',
      cardShadow: 'hover:shadow-rose-500/10',
    },
    cyan: {
      iconBg: 'bg-cyan-500/10',
      iconBorder: 'border-cyan-500/20',
      iconColor: 'text-cyan-400',
      cardBorder: 'hover:border-cyan-500/30',
      cardShadow: 'hover:shadow-cyan-500/10',
    },
    blue: {
      iconBg: 'bg-blue-500/10',
      iconBorder: 'border-blue-500/20',
      iconColor: 'text-blue-400',
      cardBorder: 'hover:border-blue-500/30',
      cardShadow: 'hover:shadow-blue-500/10',
    },
    violet: {
      iconBg: 'bg-violet-500/10',
      iconBorder: 'border-violet-500/20',
      iconColor: 'text-violet-400',
      cardBorder: 'hover:border-violet-500/30',
      cardShadow: 'hover:shadow-violet-500/10',
    },
    pink: {
      iconBg: 'bg-pink-500/10',
      iconBorder: 'border-pink-500/20',
      iconColor: 'text-pink-400',
      cardBorder: 'hover:border-pink-500/30',
      cardShadow: 'hover:shadow-pink-500/10',
    },
    orange: {
      iconBg: 'bg-orange-500/10',
      iconBorder: 'border-orange-500/20',
      iconColor: 'text-orange-400',
      cardBorder: 'hover:border-orange-500/30',
      cardShadow: 'hover:shadow-orange-500/10',
    },
  };

  const activeProjectType = projectTypes.find(pt => pt.id === activeTab);
  const activeAgents = activeProjectType?.agents || [];

  return (
    <section id="agents-section" className="relative py-20 sm:py-32 bg-gradient-to-b from-black via-indigo-950/20 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Специализированные{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              AI‑агенты
            </span>{' '}
            для каждой задачи
          </h2>
          <p className="text-lg sm:text-xl text-white/70 max-w-3xl mx-auto">
            Каждый агент — эксперт в своей области. Они работают вместе, создавая комплексное решение для вашего проекта.
          </p>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="space-y-8">
            {/* Tabs skeleton */}
            <div className="flex flex-wrap justify-center gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 w-32 bg-white/5 rounded-lg animate-pulse" />
              ))}
            </div>
            {/* Agents grid skeleton */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-40 bg-white/5 rounded-2xl border border-white/10 animate-pulse" />
              ))}
            </div>
          </div>
        ) : projectTypes.length > 0 ? (
          <div className="space-y-8">
            {/* Tabs */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
              {projectTypes.map((projectType) => (
                <button
                  key={projectType.id}
                  onClick={() => setActiveTab(projectType.id)}
                  className={`px-6 py-3 rounded-xl font-medium text-sm sm:text-base transition-all duration-300 ${
                    activeTab === projectType.id
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/50'
                      : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white border border-white/20'
                  }`}
                >
                  {projectType.name}
                </button>
              ))}
            </div>

            {/* Active Tab Agents Grid */}
            {activeAgents.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {activeAgents.map((agent, index) => {
                  const Icon = getIconForAgent(agent.name, agent.role);
                  const color = getColorForAgent(agent.name, agent.role, index);
                  const colors = colorClasses[color as keyof typeof colorClasses];

                  return (
                    <div
                      key={agent.id}
                      className="relative group"
                    >
                      {/* Card */}
                      <div className={`relative h-full bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl rounded-2xl p-6 border border-white/20 ${colors.cardBorder} transition-all duration-300 hover:shadow-2xl ${colors.cardShadow} overflow-hidden group-hover:-translate-y-1`}>
                        {/* Glow effect */}
                        <div className={`absolute top-0 right-0 w-48 h-48 ${colors.iconBg.replace('/10', '/20')} rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 transition-colors duration-500`}></div>

                        {/* Icon */}
                        <div className={`relative mb-4 inline-flex p-3 ${colors.iconBg} rounded-xl border ${colors.iconBorder} group-hover:scale-110 transition-all duration-300`}>
                          <Icon className={`w-5 h-5 ${colors.iconColor}`} />
                        </div>

                        {/* Name */}
                        <h3 className="relative text-lg font-bold text-white mb-3 leading-tight group-hover:text-white transition-colors">
                          {agent.name}
                        </h3>

                        {/* Description */}
                        <p className="relative text-sm text-white/70 leading-relaxed">
                          {agent.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-white/60 text-lg">
                  В этом типе проекта пока нет агентов
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-12">
            <p className="text-white/60 text-lg">
              Агенты загружаются...
            </p>
            <p className="text-white/40 text-sm mt-2">
              Если агентов нет в системе, они появятся здесь автоматически после добавления
            </p>
          </div>
        )}
      </div>
    </section>
  );
};
