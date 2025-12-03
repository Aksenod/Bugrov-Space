import React from 'react';
import { Clock, Layers, TrendingUp } from 'lucide-react';

export const PainPointsSection: React.FC = () => {
  const painPoints = [
    {
      icon: Clock,
      problem: 'Неделя на ресёрч и тексты, которые никто не оценит',
      result: 'Готовый прототип с текстами за 15 минут',
      metric: '40+ часов',
      metricLabel: 'экономии',
    },
    {
      icon: Layers,
      problem: 'Клиент просит 3 варианта, а у вас есть время только на один',
      result: 'Все варианты готовы за час — клиент выбирает на одном созвоне',
      metric: 'неделя → 1 час',
      metricLabel: 'вместо',
    },
    {
      icon: TrendingUp,
      problem: 'Клиенты торгуются, а ручная работа съедает маржу',
      result: 'Делаете на 2–3 проекта больше в месяц с той же командой',
      metric: '+2–3 проекта',
      metricLabel: 'в месяц',
    },
  ];

  return (
    <section className="relative py-20 sm:py-32 bg-gradient-to-b from-black via-indigo-950/20 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Экономьте{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              40+ часов
            </span>{' '}
            на каждом проекте — если делаете от 1 проекта в месяц, это уже окупается
          </h2>
          <p className="text-lg sm:text-xl text-white/70 max-w-3xl mx-auto">
            Bugrov.Space экономит вам часы рутины на каждом проекте и помогает держать дедлайны без падения маржи.
          </p>
        </div>

        {/* Pain points grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {painPoints.map((point, index) => {
            const Icon = point.icon;
            return (
              <div
                key={index}
                className="relative group"
              >
                {/* Card */}
                <div className="relative h-full bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl rounded-2xl p-6 sm:p-8 border border-white/20 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/20 overflow-hidden group-hover:-translate-y-1">
                  {/* Glow effect */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/20 transition-colors duration-500"></div>

                  {/* Icon */}
                  <div className="relative mb-6 inline-flex p-3 bg-gradient-to-br from-white/10 to-transparent rounded-xl border border-white/20 group-hover:border-indigo-500/50 group-hover:scale-110 transition-all duration-300">
                    <Icon className="w-6 h-6 text-indigo-300 group-hover:text-indigo-200 transition-colors" />
                  </div>

                  {/* Problem */}
                  <h3 className="relative text-lg sm:text-xl font-bold text-white/90 mb-4 leading-tight group-hover:text-white transition-colors">
                    {point.problem}
                  </h3>

                  {/* Result - главный акцент */}
                  <div className="relative pt-4 border-t border-emerald-500/30">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <p className="text-white text-base sm:text-lg leading-relaxed font-semibold flex-1">
                        {point.result}
                      </p>
                    </div>
                    
                    {/* Metric */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
                      <span className="text-sm font-bold text-emerald-300">
                        {point.metric}
                      </span>
                      <span className="text-xs text-emerald-400/70">
                        {point.metricLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
