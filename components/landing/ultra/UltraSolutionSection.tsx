import React, { useState, useEffect } from 'react';
import { FileText, Code, CheckCircle, Rocket, ArrowRight, Zap, Sparkles } from 'lucide-react';

export const UltraSolutionSection: React.FC = () => {
    const [activeStep, setActiveStep] = useState(0);

    const steps = [
        {
            icon: FileText,
            title: "Опишите идею",
            desc: "Просто расскажите, что вы хотите создать. На русском языке, без технических деталей.",
            color: "from-blue-500 to-cyan-500",
            bgColor: "bg-blue-500/10",
            borderColor: "border-blue-500/30",
            delay: 0,
        },
        {
            icon: Sparkles,
            title: "AI анализирует",
            desc: "Наши агенты разбивают задачу на этапы, создают план и распределяют работу между собой.",
            color: "from-purple-500 to-pink-500",
            bgColor: "bg-purple-500/10",
            borderColor: "border-purple-500/30",
            delay: 500,
        },
        {
            icon: Code,
            title: "Генерируется код",
            desc: "Агенты пишут код, тестируют его, исправляют ошибки и оптимизируют производительность.",
            color: "from-pink-500 to-rose-500",
            bgColor: "bg-pink-500/10",
            borderColor: "border-pink-500/30",
            delay: 1000,
        },
        {
            icon: CheckCircle,
            title: "Проверка качества",
            desc: "Автоматическое тестирование, проверка на соответствие стандартам и финальная оптимизация.",
            color: "from-green-500 to-emerald-500",
            bgColor: "bg-green-500/10",
            borderColor: "border-green-500/30",
            delay: 1500,
        },
        {
            icon: Rocket,
            title: "Готово к запуску",
            desc: "Ваше приложение готово к деплою. Полностью рабочий код, документация и инструкции по развёртыванию.",
            color: "from-orange-500 to-yellow-500",
            bgColor: "bg-orange-500/10",
            borderColor: "border-orange-500/30",
            delay: 2000,
        },
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveStep((prev) => (prev + 1) % steps.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <section className="py-32 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/10 to-transparent" />
            <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />

            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center mb-20">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
                        <Zap className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-medium text-purple-300">Как это работает</span>
                    </div>
                    <h2 className="text-5xl md:text-7xl font-black mb-8 leading-tight">
                        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400">
                            Магия автономных
                        </span>
                        <span className="block text-white mt-2">
                            агентов в действии
                        </span>
                    </h2>
                    <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto">
                        От вашей идеи до готового продукта — всего за несколько шагов.
                    </p>
                </div>

                {/* Spiral/Vertical Flow Layout */}
                <div className="max-w-5xl mx-auto relative">
                    {/* Connecting Line - Spiral */}
                    <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-1 -translate-x-1/2">
                        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/30 via-purple-500/30 via-pink-500/30 via-green-500/30 to-orange-500/30 blur-sm" />
                        <div className="absolute inset-0 bg-gradient-to-b from-blue-500 via-purple-500 via-pink-500 via-green-500 to-orange-500 animate-pulse" />
                    </div>

                    {/* Steps */}
                    <div className="space-y-12 md:space-y-20">
                        {steps.map((step, index) => {
                            const isActive = activeStep === index;
                            const isLeft = index % 2 === 0;

                            return (
                                <div
                                    key={index}
                                    className={`relative flex flex-col md:flex-row items-center gap-8 ${
                                        isLeft ? 'md:flex-row' : 'md:flex-row-reverse'
                                    }`}
                                    style={{
                                        animationDelay: `${step.delay}ms`,
                                    }}
                                >
                                    {/* Step Card */}
                                    <div
                                        className={`relative flex-1 p-8 rounded-3xl border-2 ${
                                            isActive
                                                ? `${step.bgColor} ${step.borderColor} scale-105 shadow-2xl`
                                                : 'bg-white/5 border-white/10'
                                        } backdrop-blur-md transition-all duration-500 group`}
                                        onMouseEnter={() => setActiveStep(index)}
                                    >
                                        {/* Glow Effect */}
                                        {isActive && (
                                            <div
                                                className={`absolute -inset-1 bg-gradient-to-r ${step.color} rounded-3xl blur-xl opacity-50 -z-10 animate-pulse`}
                                            />
                                        )}

                                        {/* Icon */}
                                        <div
                                            className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-6 ${
                                                isActive ? 'scale-110 rotate-12' : ''
                                            } transition-all duration-500 shadow-lg`}
                                        >
                                            <step.icon className="w-10 h-10 text-white" />
                                        </div>

                                        {/* Content */}
                                        <div className="flex items-center gap-4 mb-4">
                                            <span className="text-4xl font-black text-white/20 group-hover:text-white transition-colors">
                                                {String(index + 1).padStart(2, '0')}
                                            </span>
                                            <h3 className="text-2xl md:text-3xl font-bold text-white">
                                                {step.title}
                                            </h3>
                                        </div>
                                        <p className="text-lg text-gray-300 leading-relaxed">
                                            {step.desc}
                                        </p>

                                        {/* Active Indicator */}
                                        {isActive && (
                                            <div className="absolute top-4 right-4 w-3 h-3 rounded-full bg-green-400 animate-pulse shadow-lg shadow-green-400/50" />
                                        )}
                                    </div>

                                    {/* Connector Arrow - Desktop */}
                                    {index < steps.length - 1 && (
                                        <div className="hidden md:block absolute left-1/2 -translate-x-1/2 top-full w-12 h-12 -mt-6 z-10">
                                            <div className="w-full h-full rounded-full bg-gradient-to-b from-purple-500 to-pink-500 flex items-center justify-center animate-bounce">
                                                <ArrowRight className="w-6 h-6 text-white rotate-90" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Bottom CTA */}
                <div className="mt-20 text-center">
                    <div className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 backdrop-blur-sm">
                        <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                        <span className="text-white font-semibold">
                            Всё происходит автоматически. Вам нужно только описать идею.
                        </span>
                    </div>
                </div>
            </div>
        </section>
    );
};

