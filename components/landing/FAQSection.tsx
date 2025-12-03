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
      answer: 'Поделиться ссылкой с&nbsp;заказчиком для&nbsp;согласования, сохранить себе для&nbsp;дальнейшей работы или использовать как основу для&nbsp;вёрстки. Прототип полностью готов к&nbsp;презентации и&nbsp;содержит продуманную структуру и&nbsp;тексты.',
    },
    {
      question: 'Какие типы проектов можно создавать?',
      answer: 'Платформа предлагает готовые связки агентов для&nbsp;лендингов, сайтов, портфолио, приложений, сервисов и&nbsp;продвижения в&nbsp;соцсетях. Мы постоянно добавляем новые сценарии под&nbsp;запросы пользователей.',
    },
    {
      question: 'Насколько хороши тексты и UX?',
      answer: 'Сервис работает по&nbsp;цепочке специализированных агентов, опираясь на&nbsp;проверенные паттерны UX и&nbsp;копирайтинга. Вы можете легко допилить результат под&nbsp;свой стиль, но&nbsp;базовый уровень уже продающий и&nbsp;готов к&nbsp;презентации.',
    },
    {
      question: 'Чем отличаются разные сценарии?',
      answer: 'Каждый сценарий — это специально подобранная связка агентов под&nbsp;конкретную задачу. Например, для&nbsp;лендинга работает цепочка из&nbsp;4&nbsp;агентов (сегментация, персоны, UX, копирайт), а&nbsp;для&nbsp;продвижения в&nbsp;соцсетях — 7&nbsp;других агентов, специализирующихся на&nbsp;контент-стратегии.',
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
