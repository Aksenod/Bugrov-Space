import React from 'react';
import { X, Copy, CheckCircle } from 'lucide-react';

interface RequisitesPageProps {
  onClose: () => void;
}

export const RequisitesPage: React.FC<RequisitesPageProps> = ({ onClose }) => {
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const requisites = [
    { label: 'Получатель', value: 'БУГРОВ ДЕНИС ВИКТОРОВИЧ', field: 'name' },
    { label: 'ИНН', value: '7707083893', field: 'inn' },
    { label: 'Номер счёта', value: '40817810830063350302', field: 'account' },
    { label: 'Банк получателя', value: 'ЮГО-ЗАПАДНЫЙ БАНК ПАО СБЕРБАНК', field: 'bank' },
    { label: 'БИК', value: '046015602', field: 'bik' },
    { label: 'Корр. счёт', value: '30101810600000000602', field: 'corr' },
  ];

  const contacts = [
    { label: 'E-mail', value: 'Dan.bugrov@yandex.ru', field: 'email' },
    { label: 'Сайт', value: 'https://bugrov.space', field: 'website', isLink: true },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black text-white overflow-y-auto">
      <div className="min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-black/95 backdrop-blur-xl border-b border-white/10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold">Реквизиты</h1>
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
          {/* Status */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Самозанятый: БУГРОВ ДЕНИС ВИКТОРОВИЧ</h2>
            <p className="text-white/60 text-sm">
              Статус: плательщик налога на профессиональный доход (НПД, «самозанятый»)
            </p>
          </div>

          {/* Bank Details */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 sm:p-8">
            <h3 className="text-lg font-bold mb-4">Банковские реквизиты для оплаты</h3>
            <div className="space-y-4">
              {requisites.map(({ label, value, field }) => (
                <div key={field} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <div className="flex-1">
                    <div className="text-white/50 text-xs mb-1">{label}</div>
                    <div className="text-white font-medium break-all">{value}</div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(value, field)}
                    className="flex items-center gap-2 px-3 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded-lg border border-indigo-400/30 hover:border-indigo-400/50 transition-all text-sm font-medium self-start sm:self-center"
                  >
                    {copiedField === field ? (
                      <>
                        <CheckCircle size={16} />
                        <span>Скопировано</span>
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        <span>Копировать</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Contacts */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 sm:p-8">
            <h3 className="text-lg font-bold mb-4">Контакты</h3>
            <div className="space-y-4">
              {contacts.map(({ label, value, field, isLink }) => (
                <div key={field} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-4 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                  <div className="flex-1">
                    <div className="text-white/50 text-xs mb-1">{label}</div>
                    {isLink ? (
                      <a
                        href={value}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 font-medium break-all underline"
                      >
                        {value}
                      </a>
                    ) : (
                      <div className="text-white font-medium break-all">{value}</div>
                    )}
                  </div>
                  <button
                    onClick={() => copyToClipboard(value, field)}
                    className="flex items-center gap-2 px-3 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded-lg border border-indigo-400/30 hover:border-indigo-400/50 transition-all text-sm font-medium self-start sm:self-center"
                  >
                    {copiedField === field ? (
                      <>
                        <CheckCircle size={16} />
                        <span>Скопировано</span>
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        <span>Копировать</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Legal Notice */}
          <div className="bg-indigo-500/10 border border-indigo-400/20 rounded-xl p-6">
            <p className="text-white/70 text-sm leading-relaxed">
              Оплачивая услуги на данном сайте, вы подтверждаете, что ознакомились с условиями{' '}
              <a href="#/offer" className="text-indigo-300 hover:text-indigo-200 underline">
                публичной оферты
              </a>
              {' '}и{' '}
              <a href="#/privacy" className="text-indigo-300 hover:text-indigo-200 underline">
                политикой обработки персональных данных
              </a>
              {' '}и соглашаетесь с ними.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
