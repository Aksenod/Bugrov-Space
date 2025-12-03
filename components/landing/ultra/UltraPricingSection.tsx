import React, { useState } from 'react';
import { Check, Sparkles, Zap, Crown, ArrowRight } from 'lucide-react';

interface UltraPricingSectionProps {
    isAuthenticated?: boolean;
    onOpenPayment: () => void;
}

export const UltraPricingSection: React.FC<UltraPricingSectionProps> = ({ isAuthenticated, onOpenPayment }) => {
    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

    const plans = [
        {
            name: 'Старт',
            icon: Sparkles,
            price: { monthly: 0, yearly: 0 },
            description: 'Для тех, кто только начинает',
            features: [
                '1 активный проект',
                'Базовые AI-агенты',
                'Ограниченные запросы',
                'Поддержка сообщества',
            ],
            gradient: 'from-gray-500 to-gray-600',
            bgColor: 'bg-white/5',
            borderColor: 'border-white/10',
            buttonText: 'Начать бесплатно',
            popular: false,
        },
        {
            name: 'Профи',
            icon: Zap,
            price: { monthly: 49, yearly: 490 },
            description: 'Для серьёзных проектов',
            features: [
                'Безлимитные проекты',
                'Продвинутые GPT-4 агенты',
                'Приоритетная поддержка',
                'API доступ',
                'Кастомные воркфлоу',
                'Расширенная аналитика',
            ],
            gradient: 'from-purple-500 via-pink-500 to-blue-500',
            bgColor: 'bg-gradient-to-br from-purple-500/20 to-blue-500/20',
            borderColor: 'border-purple-500/50',
            buttonText: 'Выбрать Профи',
            popular: true,
        },
        {
            name: 'Корпоративный',
            icon: Crown,
            price: { monthly: null, yearly: null },
            description: 'Для команд и компаний',
            features: [
                'Всё из Профи',
                'Выделенная инфраструктура',
                'SLA гарантии',
                'Кастомные агенты',
                'On-premise опция',
                'Персональный менеджер',
            ],
            gradient: 'from-yellow-500 to-orange-500',
            bgColor: 'bg-white/5',
            borderColor: 'border-white/10',
            buttonText: 'Связаться с нами',
            popular: false,
        },
    ];

    return (
        <section className="py-32 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/10 to-transparent" />
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />

            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center mb-20">
                    <h2 className="text-5xl md:text-7xl font-black mb-8 leading-tight">
                        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400">
                            Простые цены
                        </span>
                        <span className="block text-white mt-2">
                            для больших идей
                        </span>
                    </h2>
                    <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-8">
                        Выберите план, который подходит именно вам. Начните бесплатно, масштабируйте когда нужно.
                    </p>

                    {/* Billing Toggle */}
                    <div className="inline-flex items-center gap-4 p-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                        <button
                            onClick={() => setBillingPeriod('monthly')}
                            className={`px-6 py-2 rounded-full font-semibold transition-all duration-300 ${
                                billingPeriod === 'monthly'
                                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            Месяц
                        </button>
                        <button
                            onClick={() => setBillingPeriod('yearly')}
                            className={`px-6 py-2 rounded-full font-semibold transition-all duration-300 relative ${
                                billingPeriod === 'yearly'
                                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            Год
                            <span className="absolute -top-2 -right-2 px-2 py-0.5 text-xs bg-green-500 text-white rounded-full">
                                -17%
                            </span>
                        </button>
                    </div>
                </div>

                {/* Wave/Staircase Layout */}
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
                        {plans.map((plan, index) => {
                            const isPopular = plan.popular;
                            const price = plan.price[billingPeriod];
                            const heightOffset = isPopular ? 0 : (index === 0 ? 8 : -8);

                            return (
                                <div
                                    key={plan.name}
                                    className={`relative transition-all duration-500 hover:scale-105`}
                                    style={{
                                        transform: `translateY(${heightOffset * 4}px)`,
                                    }}
                                >
                                    {/* Popular Badge */}
                                    {isPopular && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                                            <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-bold shadow-lg">
                                                Популярный выбор
                                            </div>
                                        </div>
                                    )}

                                    {/* Plan Card */}
                                    <div
                                        className={`relative p-8 rounded-3xl border-2 ${plan.borderColor} ${plan.bgColor} backdrop-blur-md h-full transition-all duration-500 ${
                                            isPopular ? 'shadow-2xl shadow-purple-500/30' : ''
                                        }`}
                                    >
                                        {/* Glow Effect for Popular */}
                                        {isPopular && (
                                            <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-3xl blur-xl opacity-50 -z-10 animate-pulse" />
                                        )}

                                        {/* Icon */}
                                        <div
                                            className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center mb-6 shadow-lg`}
                                        >
                                            <plan.icon className="w-8 h-8 text-white" />
                                        </div>

                                        {/* Name & Description */}
                                        <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                                        <p className="text-gray-400 text-sm mb-6">{plan.description}</p>

                                        {/* Price */}
                                        <div className="mb-6">
                                            {price === null ? (
                                                <div className="text-3xl font-black text-white">По запросу</div>
                                            ) : (
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-5xl font-black text-white">
                                                        {price === 0 ? '0' : price}
                                                    </span>
                                                    {price > 0 && (
                                                        <span className="text-gray-400 text-lg">
                                                            ₽/{billingPeriod === 'monthly' ? 'мес' : 'год'}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Features */}
                                        <ul className="space-y-4 mb-8">
                                            {plan.features.map((feature, i) => (
                                                <li key={i} className="flex items-start gap-3">
                                                    <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${plan.gradient} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                                                        <Check className="w-3 h-3 text-white" />
                                                    </div>
                                                    <span className="text-gray-300 text-sm leading-relaxed">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        {/* CTA Button */}
                                        <button
                                            onClick={isPopular ? onOpenPayment : undefined}
                                            className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-2 ${
                                                isPopular
                                                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:shadow-lg hover:shadow-purple-500/50 hover:scale-105'
                                                    : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                                            }`}
                                        >
                                            {plan.buttonText}
                                            {isPopular && <ArrowRight className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Bottom Note */}
                <div className="mt-16 text-center">
                    <p className="text-gray-400 text-sm">
                        Все планы включают обновления и новые функции. Отмена в любой момент.
                    </p>
                </div>
            </div>
        </section>
    );
};

