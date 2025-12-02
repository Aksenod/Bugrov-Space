import React from 'react';
import { Zap, CheckCircle, Users } from 'lucide-react';

export const HeroSection: React.FC = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-indigo-950/30 to-black overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-20 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left column - Text content */}
          <div className="text-white space-y-8">
            {/* Media placeholder - mobile only, before heading */}
            <div className="relative lg:hidden mb-8">
              <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
                {/* Placeholder for future image/video */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl backdrop-blur-sm border border-white/10 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 mx-auto bg-white/10 rounded-full flex items-center justify-center">
                      <Zap className="w-8 h-8 text-indigo-400" />
                    </div>
                    <p className="text-white/60 text-sm">Место для медиа</p>
                  </div>
                </div>
                {/* Decorative elements */}
                <div className="absolute -top-2 -right-2 w-16 h-16 bg-indigo-500/30 rounded-full blur-xl"></div>
                <div className="absolute -bottom-2 -left-2 w-20 h-20 bg-purple-500/30 rounded-full blur-xl"></div>
              </div>
            </div>

            {/* H1 */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
              Прототип проекта за{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                15 минут
              </span>{' '}
              вместо недели
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-white/80 leading-relaxed">
              Bugrov.Space — AI‑платформа для UX/UI дизайнеров и мини‑студий. Готовые связки агентов под разные задачи:
              лендинги, сайты, портфолио, приложения, сервисы, продвижение в соцсетях. Выбираете сценарий → проходите по связке агентов → получаете готовый прототип.
            </p>

            {/* Bullets */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-indigo-400 flex-shrink-0 mt-0.5" />
                <p className="text-white/90">Экономия недели на ресёрч, структуру и тексты</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-indigo-400 flex-shrink-0 mt-0.5" />
                <p className="text-white/90">Готовые сценарии под разные типы проектов</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-indigo-400 flex-shrink-0 mt-0.5" />
                <p className="text-white/90">Прототип, которым можно сразу поделиться с заказчиком</p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              {/* Primary CTA */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => window.location.hash = '#/auth'}
                  className="px-8 py-4 bg-white text-black rounded-full font-bold text-lg hover:bg-indigo-50 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-black"
                >
                  Подключить — 1000 ₽/мес
                </button>
                <span className="text-sm text-white/60 text-center">Отмена в любой момент</span>
              </div>
            </div>

            {/* Trust elements */}
            <div className="pt-8 border-t border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <Users className="w-5 h-5 text-indigo-400" />
                <p className="text-white/70 text-sm">
                  Для UX/UI дизайнеров, no‑code веб‑мастеров и мини‑студий 1–5 человек
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-indigo-400" />
                <p className="text-white/70 text-sm">
                  Уже сгенерировано 100+ прототипов по разным сценариям
                </p>
              </div>
            </div>
          </div>

          {/* Right column - Media placeholder (desktop only) */}
          <div className="relative hidden lg:block">
            <div className="relative aspect-square max-w-lg mx-auto">
              {/* Placeholder for future image/video */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-3xl backdrop-blur-sm border border-white/10 flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 mx-auto bg-white/10 rounded-full flex items-center justify-center">
                    <Zap className="w-10 h-10 text-indigo-400" />
                  </div>
                  <p className="text-white/60 text-sm">Место для медиа</p>
                </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-indigo-500/30 rounded-full blur-2xl"></div>
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-purple-500/30 rounded-full blur-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
