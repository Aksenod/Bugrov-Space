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
                <div className="relative h-full bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-xl rounded-2xl p-8 border border-white/20 hover:border-indigo-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/20 overflow-hidden group-hover:-translate-y-1">
                  {/* Glow effect */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/20 transition-colors duration-500"></div>

                  {/* Icon */}
                  <div className="relative mb-8 inline-flex p-4 bg-gradient-to-br from-white/10 to-transparent rounded-2xl border border-white/20 group-hover:border-indigo-500/50 group-hover:scale-110 transition-all duration-300 shadow-lg shadow-black/20">
                    <Icon className="w-8 h-8 text-indigo-300 group-hover:text-indigo-200 transition-colors" />
                  </div>

                  {/* Title */}
                  <h3 className="relative text-xl font-bold text-white mb-8 leading-tight group-hover:text-indigo-100 transition-colors">
                    {point.title}
                  </h3>

                  <div className="relative space-y-6">
                    {/* Before */}
                    <div>
                      <div className="inline-flex items-center px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full mb-3 shadow-sm shadow-red-900/20">
                        <span className="text-[10px] font-bold text-red-300 uppercase tracking-widest">Было</span>
                      </div>
                      <p className="text-white/70 text-sm leading-relaxed">
                        {point.before}
                      </p>
                    </div>

                    {/* Solution */}
                    <div>
                      <div className="inline-flex items-center px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full mb-3 shadow-sm shadow-blue-900/20">
                        <span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">Что даём</span>
                      </div>
                      <p className="text-white/70 text-sm leading-relaxed">
                        {point.solution}
                      </p>
                    </div>

                    {/* Result */}
                    <div className="pt-4 border-t border-white/10">
                      <div className="inline-flex items-center px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full mb-3 shadow-sm shadow-emerald-900/20">
                        <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest">Результат</span>
                      </div>
                      <p className="text-white text-sm leading-relaxed font-medium">
                        {point.result}
                      </p>
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
