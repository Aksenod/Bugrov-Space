import React from 'react';
import { X } from 'lucide-react';

interface OfferPageProps {
  onClose: () => void;
}

export const OfferPage: React.FC<OfferPageProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black text-white overflow-y-auto">
      <div className="min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-xl border-b border-white/10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold">Публичная оферта</h1>
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
              <p>1.1. Настоящая Публичная оферта (далее — «Оферта») является официальным предложением самозанятого Бугрова Дениса Викторовича (далее — «Исполнитель») заключить договор возмездного оказания услуг (далее — «Договор») с любым физическим или юридическим лицом (далее — «Заказчик») на условиях, изложенных ниже.</p>
              <p>1.2. Акцептом Оферты является оплата услуг Исполнителя. С момента оплаты Договор считается заключенным.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">2. Предмет договора</h2>
              <p>2.1. Исполнитель обязуется предоставить Заказчику доступ к сервису Bugrov.Space (далее — «Сервис») для генерации прототипов и работы с AI-агентами, а Заказчик обязуется оплатить эти услуги.</p>
              <p>2.2. Объем и стоимость услуг определяются выбранным тарифом, указанным на сайте https://bugrov.space.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">3. Порядок расчетов</h2>
              <p>3.1. Оплата услуг производится в порядке 100% предоплаты.</p>
              <p>3.2. Услуга считается оказанной в момент предоставления доступа к функционалу Сервиса на оплаченный период.</p>
              <p>3.3. В случае отказа Заказчика от услуг после начала использования Сервиса возврат денежных средств не производится, если иное не предусмотрено законодательством РФ.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">4. Права и обязанности сторон</h2>
              <p>4.1. Исполнитель обязуется обеспечивать круглосуточную доступность Сервиса, за исключением времени проведения технических работ.</p>
              <p>4.2. Заказчик обязуется использовать Сервис в соответствии с законодательством РФ и не передавать доступ третьим лицам.</p>
              <p>4.3. Исполнитель не несет ответственности за содержание, создаваемое Заказчиком с помощью Сервиса.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">5. Прочие условия</h2>
              <p>5.1. Исполнитель вправе вносить изменения в Оферту. Изменения вступают в силу с момента их публикации на сайте.</p>
              <p>5.2. Все споры решаются путем переговоров. При недостижении согласия — в судебном порядке по месту нахождения Исполнителя.</p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">6. Реквизиты Исполнителя</h2>
              <p>Самозанятый БУГРОВ ДЕНИС ВИКТОРОВИЧ</p>
              <p>ИНН: 7707083893</p>
              <p>Email: Dan.bugrov@yandex.ru</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
