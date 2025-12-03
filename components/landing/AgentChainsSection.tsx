import React from 'react';
import { Layout, Share2, Smartphone, Plus } from 'lucide-react';

export const AgentChainsSection: React.FC = () => {
  const scenarios = [
    {
      icon: Layout,
      title: 'Лендинги и сайты',
      result: 'Прототип с продающими текстами и структурой',
      agentCount: '4 агента',
      color: 'indigo',
    },
    {
      icon: Share2,
      title: 'Продвижение в соцсетях',
      result: 'Стратегия, готовые посты и сценарии для рилсов',
      agentCount: '7 агентов',
      color: 'purple',
    },
    {
      icon: Smartphone,
      title: 'Приложения и сервисы',
      result: 'UX-документация и прототип интерфейса',
      agentCount: 'Скоро',
      color: 'emerald',
    },
  ];

  const colorClasses = {
    indigo: {
      iconBg: 'bg-indigo-500/10',
      iconBorder: 'border-indigo-500/20',
      iconColor: 'text-indigo-400',
      cardBorder: 'hover:border-indigo-500/30',
      cardShadow: 'hover:shadow-indigo-500/10',
      gradientTop: 'via-indigo-500/50',
    },
    purple: {
      iconBg: 'bg-purple-500/10',
      iconBorder: 'border-purple-500/20',
      iconColor: 'text-purple-400',
      cardBorder: 'hover:border-purple-500/30',
      cardShadow: 'hover:shadow-purple-500/10',
      gradientTop: 'via-purple-500/50',
    },
    emerald: {
      iconBg: 'bg-emerald-500/10',
      iconBorder: 'border-emerald-500/20',
      iconColor: 'text-emerald-400',
      cardBorder: 'hover:border-emerald-500/30',
      cardShadow: 'hover:shadow-emerald-500/10',
      gradientTop: 'via-emerald-500/50',
    },
  };

  return (
    <section className="relative py-20 sm:py-32 bg-gradient-to-b from-black via-purple-950/20 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Готовые связки{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              AI‑агентов
            </span>{' '}
            под разные задачи
          </h2>
          <p className="text-lg sm:text-xl text-white/70 max-w-3xl mx-auto">
            Выбираете сценарий → заполняете бриф → получаете готовый прототип
          </p>
        </div>

        {/* Scenarios grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {scenarios.map((scenario, index) => {
            const Icon = scenario.icon;
            const colors = colorClasses[scenario.color as keyof typeof colorClasses];

            return (
              <div
                key={index}
                className="relative group"
              >
                {/* Card */}
                <div className={`relative h-full bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl rounded-2xl p-6 sm:p-8 border border-white/20 ${colors.cardBorder} transition-all duration-300 hover:shadow-2xl ${colors.cardShadow} overflow-hidden group-hover:-translate-y-1`}>
                  {/* Glow effect */}
                  <div className={`absolute top-0 right-0 w-64 h-64 ${colors.iconBg.replace('/10', '/20')} rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 transition-colors duration-500`}></div>

                  {/* Icon */}
                  <div className={`relative mb-6 inline-flex p-3 bg-gradient-to-br from-white/10 to-transparent rounded-xl border border-white/20 ${colors.cardBorder} group-hover:scale-110 transition-all duration-300`}>
                    <Icon className={`w-6 h-6 ${colors.iconColor}`} />
                  </div>

                  {/* Title */}
                  <h3 className="relative text-lg sm:text-xl font-bold text-white mb-4 leading-tight group-hover:text-white transition-colors">
                    {scenario.title}
                  </h3>

                  {/* Result - главный акцент */}
                  <div className="relative pt-4 border-t border-emerald-500/30">
                    <p className="text-white text-base sm:text-lg leading-relaxed font-semibold mb-3">
                      {scenario.result}
                    </p>
                    
                    {/* Agent count */}
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 ${colors.iconBg} border ${colors.iconBorder} rounded-lg`}>
                      <span className={`text-sm font-bold ${colors.iconColor}`}>
                        {scenario.agentCount}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Additional scenarios card */}
        <div className="max-w-2xl mx-auto">
          <div className="relative group">
            <div className="relative bg-gradient-to-r from-white/5 to-white/[0.02] backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-indigo-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 p-3 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl border border-white/10">
                  <Plus className="w-8 h-8 text-indigo-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">
                    Другие сценарии
                  </h3>
                  <p className="text-white/60 text-sm leading-relaxed">
                    Платформа постоянно пополняется новыми связками под разные задачи
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <button
            onClick={() => window.location.hash = '#/auth'}
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black rounded-full font-bold text-lg hover:bg-indigo-50 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black"
          >
            Выбрать сценарий
          </button>
        </div>
      </div>
    </section>
  );
};
