import React from 'react';
import { Clock, Layers, TrendingUp } from 'lucide-react';

export const PainPointsSection: React.FC = () => {
  const painPoints = [
    {
      icon: Clock,
      title: 'Рутинные структуры и тексты',
      before: 'Каждый раз заново придумывать блоки и тексты',
      solution: 'Готовые связки агентов под вашу задачу и ЦА',
      result: 'Первый прототип через 15 минут, а не через неделю',
    },
    {
      icon: Layers,
      title: 'Клиенты хотят «вчера» и несколько вариантов',
      before: '2–3 варианта проекта = ещё неделя работы',
      solution: 'Несколько прототипов из одного брифа',
      result: 'Все варианты на одном созвоне → быстрее согласование',
    },
    {
      icon: TrendingUp,
      title: 'Давление по цене и просадка маржи',
      before: 'Много ручной работы, которую клиент не хочет оплачивать',
      solution: 'Автоматизированные сценарии для разных типов проектов',
      result: 'Больше проектов в месяц без найма людей и падения маржи',
    },
  ];

  return (
    <section className="relative py-20 sm:py-32 bg-gradient-to-b from-black via-indigo-950/20 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Если вы делаете{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              от 1 проекта
            </span>{' '}
            в месяц — это про вас
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
                <div className="relative h-full bg-gradient-to-b from-white/5 to-white/[0.02] backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-indigo-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10">
                  {/* Icon */}
                  <div className="mb-6 inline-flex p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                    <Icon className="w-8 h-8 text-indigo-400" />
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-white mb-6">
                    {point.title}
                  </h3>

                  {/* Before */}
                  <div className="mb-4">
                    <div className="inline-block px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full mb-2">
                      <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Было</span>
                    </div>
                    <p className="text-white/60 text-sm leading-relaxed">
                      {point.before}
                    </p>
                  </div>

                  {/* Solution */}
                  <div className="mb-4">
                    <div className="inline-block px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full mb-2">
                      <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Что даём</span>
                    </div>
                    <p className="text-white/60 text-sm leading-relaxed">
                      {point.solution}
                    </p>
                  </div>

                  {/* Result */}
                  <div>
                    <div className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-2">
                      <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Результат</span>
                    </div>
                    <p className="text-white/80 text-sm leading-relaxed font-medium">
                      {point.result}
                    </p>
                  </div>

                  {/* Decorative gradient */}
                  <div className="absolute -top-px left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
