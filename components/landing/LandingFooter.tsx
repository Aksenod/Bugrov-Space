import React from 'react';
import { Mail, Send } from 'lucide-react';

export const LandingFooter: React.FC = () => {
  return (
    <footer className="relative bg-gradient-to-b from-black via-indigo-950/10 to-black border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          {/* Column 1: Branding & Description */}
          <div>
            <h3 className="text-2xl font-bold text-white mb-4">Bugrov.Space</h3>
            <p className="text-white/60 leading-relaxed mb-6">
              AI‑платформа для UX/UI дизайнеров и мини‑студий. Создавайте прототипы проектов за 15 минут.
            </p>
          </div>

          {/* Column 2: Navigation */}
          <div>
            <h4 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-6">Навигация</h4>
            <nav className="space-y-3">
              <a
                href="#pricing"
                className="block text-white/60 hover:text-white transition-colors"
              >
                Тариф
              </a>
              <a
                href="#faq"
                className="block text-white/60 hover:text-white transition-colors"
              >
                FAQ
              </a>
              <a
                href="#/offer"
                className="block text-white/60 hover:text-white transition-colors"
              >
                Публичная оферта
              </a>
              <a
                href="#/privacy"
                className="block text-white/60 hover:text-white transition-colors"
              >
                Политика конфиденциальности
              </a>
              <a
                href="#/requisites"
                className="block text-white/60 hover:text-white transition-colors"
              >
                Реквизиты
              </a>
            </nav>
          </div>

          {/* Column 3: Contacts */}
          <div>
            <h4 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-6">Контакты</h4>
            <div className="space-y-4">
              <a
                href="mailto:support@bugrov.space"
                className="flex items-center gap-3 text-white/60 hover:text-white transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <span>support@bugrov.space</span>
              </a>
              <a
                href="https://t.me/bugrovspace"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-white/60 hover:text-white transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                  <Send className="w-5 h-5" />
                </div>
                <span>@bugrovspace</span>
              </a>
            </div>

            {/* Community link */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-sm text-white/40 mb-2">Сообщество:</p>
              <a
                href="https://t.me/bugrovspace_community"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Telegram-канал для UX/UI дизайнеров
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-white/40">
              © {new Date().getFullYear()} Bugrov.Space. Все права защищены.
            </p>
            <div className="flex items-center gap-4 text-sm">
              <a
                href="#/offer"
                className="text-white/40 hover:text-white/60 transition-colors"
              >
                Оферта
              </a>
              <span className="text-white/20">•</span>
              <a
                href="#/privacy"
                className="text-white/40 hover:text-white/60 transition-colors"
              >
                Конфиденциальность
              </a>
              <span className="text-white/20">•</span>
              <a
                href="#/requisites"
                className="text-white/40 hover:text-white/60 transition-colors"
              >
                Реквизиты
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
