import React from 'react';
import { MessageCircle, FileText, Shield, Building2 } from 'lucide-react';

interface FooterProps {
  telegramUsername?: string;
}

export const Footer: React.FC<FooterProps> = ({ telegramUsername = 'your_username' }) => {
  return (
    <footer className="flex-shrink-0 border-t border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="px-4 sm:px-6 py-6">
        <div className="max-w-6xl mx-auto">
          {/* Main content */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Left: Telegram Contact */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <a
                href={`https://t.me/${telegramUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded-xl border border-indigo-400/30 hover:border-indigo-400/50 transition-all font-medium text-sm"
              >
                <MessageCircle size={18} />
                <span>Написать в Telegram</span>
              </a>
              <span className="text-white/40 text-sm hidden sm:inline">
                Есть вопросы? Напишите нам!
              </span>
            </div>

            {/* Right: Links */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-sm">
              <a
                href="/docs/offer.pdf"
                className="inline-flex items-center gap-1.5 text-white/60 hover:text-white transition-colors"
              >
                <FileText size={14} />
                <span>Публичная оферта</span>
              </a>
              <a
                href="/docs/privacy.pdf"
                className="inline-flex items-center gap-1.5 text-white/60 hover:text-white transition-colors"
              >
                <Shield size={14} />
                <span>Политика конфиденциальности</span>
              </a>
              <a
                href="/docs/requisites.pdf"
                className="inline-flex items-center gap-1.5 text-white/60 hover:text-white transition-colors"
              >
                <Building2 size={14} />
                <span>Реквизиты</span>
              </a>
            </div>
          </div>

          {/* Bottom: Copyright */}
          <div className="mt-6 pt-4 border-t border-white/5 text-center sm:text-left">
            <p className="text-white/40 text-xs">
              © {new Date().getFullYear()} Bugrov Space. Все права защищены.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
