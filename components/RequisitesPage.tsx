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
    { label: 'Самозанятый', value: 'БУГРОВ ДЕНИС ВИКТОРОВИЧ', field: 'name' },
    { label: 'ИНН', value: '7707083893', field: 'inn' },
    { label: 'Номер счёта', value: '40817810830063350302', field: 'account' },
    { label: 'Банк получателя', value: 'ЮГО-ЗАПАДНЫЙ БАНК ПАО СБЕРБАНК', field: 'bank' },
    { label: 'БИК', value: '046015602', field: 'bik' },
    { label: 'Корр. счёт', value: '30101810600000000602', field: 'corr' },
    { label: 'КПП', value: '236643001', field: 'kpp' },
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 sm:p-8">
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

            {/* Info */}
            <div className="mt-8 p-4 bg-indigo-500/10 border border-indigo-400/20 rounded-lg">
              <p className="text-white/60 text-sm">
                <span className="text-indigo-300 font-medium">Важно:</span> При переводе указывайте назначение платежа.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
