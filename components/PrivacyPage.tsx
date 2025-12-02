import React from 'react';
import { X } from 'lucide-react';

interface PrivacyPageProps {
  onClose: () => void;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black text-white overflow-y-auto">
      <div className="min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-xl border-b border-white/10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold">Политика конфиденциальности</h1>
            <button
              onClick={onClose}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              title="Закрыть"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-white/5 border border-white/10 rounded-xl p-8 space-y-6 text-white/80 leading-relaxed">
            <p className="text-sm text-white/40">Редакция от 02.12.2025</p>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">1. Общие положения</h2>
              <p>1.1. Настоящая Политика конфиденциальности определяет порядок обработки и защиты персональных данных пользователей сайта https://bugrov.space (далее — «Сайт»).</p>
              <p>1.2. Оператором персональных данных является самозанятый Бугров Денис Викторович (далее — «Оператор»).</p>
              <p>1.3. Использование Сайта означает согласие пользователя с настоящей Политикой и условиями обработки его персональных данных.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">2. Состав персональных данных</h2>
              <p>2.1. Оператор может обрабатывать следующие данные пользователя:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Имя пользователя (логин);</li>
                <li>Адрес электронной почты;</li>
                <li>Данные, автоматически передаваемые сервисами аналитики (Яндекс.Метрика и др.), включая IP-адрес, файлы cookie, информацию о браузере.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">3. Цели обработки данных</h2>
              <p>3.1. Персональные данные обрабатываются в целях:</p>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>Предоставления доступа к функционалу Сайта;</li>
                <li>Установления обратной связи с пользователем;</li>
                <li>Улучшения качества работы Сайта и аналитики посещаемости.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">4. Порядок обработки и защиты данных</h2>
              <p>4.1. Оператор принимает необходимые организационные и технические меры для защиты персональных данных от неправомерного доступа.</p>
              <p>4.2. Персональные данные не передаются третьим лицам, за исключением случаев, предусмотренных законодательством РФ.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">5. Изменение и удаление данных</h2>
              <p>5.1. Пользователь может в любой момент отозвать свое согласие на обработку персональных данных, направив уведомление на электронную почту Dan.bugrov@yandex.ru.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">6. Заключительные положения</h2>
              <p>6.1. Оператор вправе вносить изменения в настоящую Политику. Новая редакция вступает в силу с момента ее размещения на Сайте.</p>
              <p>6.2. Контакты для связи: Dan.bugrov@yandex.ru.</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
