import React from 'react';
import { FileText, Shield, Building2 } from 'lucide-react';

interface FooterProps {
  telegramUsername?: string;
}

export const Footer: React.FC<FooterProps> = ({ telegramUsername = 'your_username' }) => {
  return (
    <footer className="flex-shrink-0 border-t border-white/5 bg-black/20">
      <div className="px-4 sm:px-6 py-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          {/* Left: Copyright */}
          <div className="text-white/30 order-2 sm:order-1">
            © {new Date().getFullYear()} Bugrov Space
          </div>

          {/* Right: Links */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 order-1 sm:order-2">
            <a
              href="#/offer"
              className="text-white/50 hover:text-white/80 transition-colors"
            >
              Публичная оферта
            </a>
            <span className="text-white/20">•</span>
            <a
              href="#/privacy"
              className="text-white/50 hover:text-white/80 transition-colors"
            >
              Политика конфиденциальности
            </a>
            <span className="text-white/20">•</span>
            <a
              href="#/requisites"
              className="text-white/50 hover:text-white/80 transition-colors"
            >
              Реквизиты
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
