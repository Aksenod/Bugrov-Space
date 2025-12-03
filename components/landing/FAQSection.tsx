import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

export const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs: FAQItem[] = [
    {
      question: 'Как быстро я получу первый прототип?',
      answer: 'В среднем — 15 минут после заполнения брифа. Система автоматически проходит все этапы: сегментация аудитории, создание персон, проектирование UX-структуры и генерация текстов.',
    },
    {
      question: 'Что я могу сделать с прототипом?',
      answer: 'Поделиться ссылкой с заказчиком для согласования, сохранить себе для дальнейшей работы или использовать как основу для вёрстки. Прототип полностью готов к презентации и содержит продуманную структуру и тексты.',
    },
    {
      question: 'Какие типы проектов можно создавать?',
      answer: 'Платформа предлагает готовые связки агентов для лендингов, сайтов, портфолио, приложений, сервисов и продвижения в соцсетях. Мы постоянно добавляем новые сценарии под запросы пользователей.',
    },
    {
      question: 'Насколько хороши тексты и UX?',
      answer: 'Сервис работает по цепочке специализированных агентов, опираясь на проверенные паттерны UX и копирайтинга. Вы можете легко допилить результат под свой стиль, но базовый уровень уже продающий и готов к презентации.',
    },
    {
      question: 'Чем отличаются разные сценарии?',
      answer: 'Каждый сценарий — это специально подобранная связка агентов под конкретную задачу. Например, для лендинга работает цепочка из 4 агентов (сегментация, персоны, UX, копирайт), а для продвижения в соцсетях — 7 других агентов, специализирующихся на контент-стратегии.',
    },
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="relative py-20 sm:py-32 bg-gradient-to-b from-black via-purple-950/20 to-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Ответы на{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              5 главных вопросов
            </span>{' '}
            перед стартом
          </h2>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="relative group"
              >
                <div className={`relative bg-gradient-to-b from-white/5 to-white/[0.02] backdrop-blur-sm rounded-2xl border transition-all duration-300 ${isOpen ? 'border-indigo-500/30' : 'border-white/10 hover:border-white/20'}`}>
                  {/* Question button */}
                  <button
                    onClick={() => toggleFAQ(index)}
                    className="w-full text-left p-6 sm:p-8 flex items-center justify-between gap-4 focus:outline-none"
                  >
                    <h3 className="text-lg sm:text-xl font-semibold text-white pr-4">
                      {faq.question}
                    </h3>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center transition-transform duration-300 ${isOpen ? 'rotate-180 bg-indigo-500/20 border-indigo-500/30' : ''}`}>
                      <ChevronDown className={`w-5 h-5 transition-colors ${isOpen ? 'text-indigo-400' : 'text-white/60'}`} />
                    </div>
                  </button>

                  {/* Answer */}
                  <div
                    className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96' : 'max-h-0'}`}
                  >
                    <div className="px-6 sm:px-8 pb-6 sm:pb-8">
                      <p className="text-white/70 leading-relaxed">
                        {faq.answer}
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
