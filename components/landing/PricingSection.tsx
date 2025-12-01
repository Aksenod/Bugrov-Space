import React from 'react';
import { Check, Sparkles } from 'lucide-react';

export const PricingSection: React.FC = () => {
  const features = [
    'Доступ ко всем связкам агентов платформы',
    'Сценарии для лендингов, сайтов, приложений, сервисов, соцсетей',
    'Генерация прототипов без ограничений',
    'Сохранение и публикация прототипов',
    'Библиотека шаблонов под ключевые ниши',
    'Новые сценарии добавляются автоматически',
    'Поддержка и помощь в онбординге',
  ];

  return (
    <section className="relative py-20 sm:py-32 bg-gradient-to-b from-black via-indigo-950/20 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Один честный тариф{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              без скрытых ограничений
            </span>
          </h2>
        </div>

        {/* Pricing card */}
        <div className="max-w-2xl mx-auto">
          <div className="relative group">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>

            {/* Card */}
            <div className="relative bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xl rounded-3xl border border-white/20 overflow-hidden">
              {/* Badge */}
              <div className="absolute top-0 right-0 m-6">
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-full border border-white/20">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-semibold text-white">Для фрилансеров и мини‑студий</span>
                </div>
              </div>

              <div className="p-8 sm:p-12">
                {/* Plan name and price */}
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-white mb-4">Тариф «Pro»</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl sm:text-6xl font-bold text-white">1000 ₽</span>
                    <span className="text-2xl text-white/60">/ месяц</span>
                  </div>
                </div>

                {/* What's included */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-white mb-6">Что входит:</h4>
                  <div className="space-y-4">
                    {features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <div className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                            <Check className="w-3 h-3 text-indigo-400" />
                          </div>
                        </div>
                        <p className="text-white/80 leading-relaxed">{feature}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Conditions */}
                <div className="mb-8 p-6 bg-white/5 rounded-2xl border border-white/10">
                  <h4 className="text-sm font-semibold text-white/80 mb-4 uppercase tracking-wider">Условия:</h4>
                  <ul className="space-y-2 text-white/60 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-400">•</span>
                      <span>Ежемесячная подписка, отмена в любой момент</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-400">•</span>
                      <span>Без скрытых платежей и сложных пакетов</span>
                    </li>
                  </ul>
                </div>

                {/* CTA */}
                <div className="space-y-4">
                  <button
                    onClick={() => window.location.hash = '#/auth'}
                    className="w-full px-8 py-4 bg-white text-black rounded-full font-bold text-lg hover:bg-indigo-50 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black/50"
                  >
                    Подключить — 1000 ₽/мес
                  </button>

                  {/* Hint */}
                  <p className="text-center text-sm text-white/50">
                    Один дополнительный проект в месяц уже окупает подписку
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
