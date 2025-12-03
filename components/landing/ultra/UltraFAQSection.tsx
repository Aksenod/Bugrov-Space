import React, { useState } from 'react';
import { ChevronDown, HelpCircle, Sparkles } from 'lucide-react';

export const UltraFAQSection: React.FC = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const faqs = [
        {
            question: 'Как быстро я смогу создать свой первый проект?',
            answer: 'Буквально за несколько минут. Просто опишите свою идею на русском языке, и наши AI-агенты начнут работу. Первый прототип будет готов уже через 10-15 минут, а полноценное приложение — в течение часа.',
        },
        {
            question: 'Какие технологии поддерживает платформа?',
            answer: 'Мы поддерживаем все популярные технологии: React, Vue, Angular, Node.js, Python, Django, Flask и многие другие. Агенты автоматически выбирают оптимальный стек для вашего проекта.',
        },
        {
            question: 'Могу ли я использовать код в коммерческих проектах?',
            answer: 'Абсолютно! Весь сгенерированный код принадлежит вам. Вы можете использовать его для любых целей, включая коммерческие проекты, без каких-либо ограничений.',
        },
        {
            question: 'Как работает система агентов?',
            answer: 'Каждый агент — это специализированный AI-эксперт в своей области (фронтенд, бэкенд, дизайн, тестирование и т.д.). Они работают вместе, как команда: один агент создаёт архитектуру, другой пишет код, третий тестирует. Всё происходит автоматически и параллельно.',
        },
        {
            question: 'Что если мне нужна помощь или поддержка?',
            answer: 'У нас есть несколько уровней поддержки. Бесплатный план включает доступ к сообществу и документации. Профи-план даёт приоритетную поддержку через email и чат. Корпоративный план включает персонального менеджера.',
        },
        {
            question: 'Можно ли кастомизировать агентов под мои нужды?',
            answer: 'Да! В профи-плане вы можете создавать кастомных агентов с собственными инструкциями и специализацией. Это позволяет адаптировать платформу под специфические требования ваших проектов.',
        },
        {
            question: 'Безопасны ли мои данные и проекты?',
            answer: 'Безопасность — наш приоритет. Все данные шифруются, проекты изолированы друг от друга, и мы регулярно проходим аудиты безопасности. Вы также можете выбрать on-premise решение для корпоративных клиентов.',
        },
        {
            question: 'Что происходит, если я хочу отменить подписку?',
            answer: 'Вы можете отменить подписку в любой момент без штрафов. После отмены вы сохраните доступ к своим проектам до конца оплаченного периода, а затем перейдёте на бесплатный план.',
        },
    ];

    return (
        <section className="py-32 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-900/5 to-transparent" />

            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center mb-20">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6">
                        <HelpCircle className="w-4 h-4 text-blue-400" />
                        <span className="text-sm font-medium text-blue-300">Частые вопросы</span>
                    </div>
                    <h2 className="text-5xl md:text-7xl font-black mb-8 leading-tight">
                        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400">
                            Всё, что нужно знать
                        </span>
                        <span className="block text-white mt-2">
                            о нашей платформе
                        </span>
                    </h2>
                    <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto">
                        Ответы на самые популярные вопросы от наших пользователей.
                    </p>
                </div>

                {/* Diagonal/Side-by-side Layout */}
                <div className="max-w-4xl mx-auto">
                    <div className="space-y-4">
                        {faqs.map((faq, index) => {
                            const isOpen = openIndex === index;

                            return (
                                <div
                                    key={index}
                                    className="group relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm transition-all duration-500 hover:bg-white/10 hover:border-white/20"
                                >
                                    {/* Question */}
                                    <button
                                        onClick={() => setOpenIndex(isOpen ? null : index)}
                                        className="w-full p-6 flex items-center justify-between gap-4 text-left group-hover:text-white transition-colors"
                                    >
                                        <div className="flex items-start gap-4 flex-1">
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                                                <span className="text-sm font-bold text-blue-400">
                                                    {String(index + 1).padStart(2, '0')}
                                                </span>
                                            </div>
                                            <h3 className="text-lg md:text-xl font-bold text-white flex-1">
                                                {faq.question}
                                            </h3>
                                        </div>
                                        <div
                                            className={`w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 transition-transform duration-500 ${
                                                isOpen ? 'rotate-180 bg-blue-500/20' : ''
                                            }`}
                                        >
                                            <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                                        </div>
                                    </button>

                                    {/* Answer */}
                                    <div
                                        className={`overflow-hidden transition-all duration-500 ${
                                            isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                                        }`}
                                    >
                                        <div className="px-6 pb-6 pl-18">
                                            <div className="pl-6 border-l-2 border-blue-500/30">
                                                <p className="text-gray-300 leading-relaxed text-lg">
                                                    {faq.answer}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Glow Effect */}
                                    {isOpen && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 pointer-events-none" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Bottom CTA */}
                <div className="mt-20 text-center">
                    <div className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 backdrop-blur-sm">
                        <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                        <span className="text-white font-semibold">
                            Остались вопросы? Напишите нам — мы всегда готовы помочь!
                        </span>
                    </div>
                </div>
            </div>
        </section>
    );
};

