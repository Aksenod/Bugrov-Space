import React, { useState } from 'react';
import { Clock, Layers, TrendingUp, AlertTriangle } from 'lucide-react';

export const UltraProblemSection: React.FC = () => {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    const problems = [
        {
            icon: Clock,
            title: "Рутинные структуры и тексты",
            before: "Каждый раз заново придумывать блоки и тексты",
            solution: "Готовые связки агентов под вашу задачу и ЦА",
            result: "Первый прототип через 15 минут, а не через неделю",
            color: "from-red-500/20 to-orange-500/20",
            borderColor: "border-red-500/30",
            iconColor: "text-red-400",
            rotation: "-rotate-2",
        },
        {
            icon: Layers,
            title: "Клиенты хотят «вчера» и несколько вариантов",
            before: "2–3 варианта проекта = ещё неделя работы",
            solution: "Несколько прототипов из одного брифа",
            result: "Все варианты на одном созвоне → быстрее согласование",
            color: "from-yellow-500/20 to-amber-500/20",
            borderColor: "border-yellow-500/30",
            iconColor: "text-yellow-400",
            rotation: "rotate-2",
        },
        {
            icon: TrendingUp,
            title: "Давление по цене и просадка маржи",
            before: "Много ручной работы, которую клиент не хочет оплачивать",
            solution: "Автоматизированные сценарии для разных типов проектов",
            result: "Больше проектов в месяц без найма людей и падения маржи",
            color: "from-purple-500/20 to-pink-500/20",
            borderColor: "border-purple-500/30",
            iconColor: "text-purple-400",
            rotation: "-rotate-1",
        },
    ];

    return (
        <section className="py-32 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-900/5 to-transparent" />
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />

            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center mb-20">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 mb-6">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                        <span className="text-sm font-medium text-red-300">Проблемы, которые мы решаем</span>
                    </div>
                    <h2 className="text-5xl md:text-7xl font-black mb-8 leading-tight">
                        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">
                            Если вы делаете
                        </span>
                        <span className="block text-white mt-2">
                            от 1 проекта в месяц — это про вас
                        </span>
                    </h2>
                    <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto">
                        Bugrov.Space экономит вам часы рутины на каждом проекте и помогает держать дедлайны без падения маржи.
                    </p>
                </div>

                {/* Zigzag Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                    {problems.map((problem, index) => {
                        const isEven = index % 2 === 0;
                        const isHovered = hoveredIndex === index;

                        return (
                            <div
                                key={index}
                                className={`group relative ${isEven ? 'md:translate-y-12' : ''} transition-all duration-500`}
                                onMouseEnter={() => setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                                style={{
                                    transform: isHovered
                                        ? `perspective(1000px) rotateX(5deg) rotateY(${isEven ? '-5deg' : '5deg'}) translateY(-10px) scale(1.05)`
                                        : `perspective(1000px) rotateX(0deg) rotateY(0deg)`,
                                    transformStyle: 'preserve-3d',
                                }}
                            >
                                {/* Glass Morphism Card with Broken Glass Effect */}
                                <div
                                    className={`relative p-8 rounded-3xl bg-gradient-to-br ${problem.color} border-2 ${problem.borderColor} backdrop-blur-md overflow-hidden ${problem.rotation} transition-all duration-500`}
                                    style={{
                                        clipPath: isHovered
                                            ? 'polygon(0% 0%, 100% 0%, 95% 5%, 100% 10%, 95% 15%, 100% 20%, 98% 25%, 100% 30%, 95% 35%, 100% 40%, 98% 45%, 100% 50%, 95% 55%, 100% 60%, 98% 65%, 100% 70%, 95% 75%, 100% 80%, 98% 85%, 100% 90%, 95% 95%, 100% 100%, 0% 100%)'
                                            : 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
                                    }}
                                >
                                    {/* Shimmer Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                                    {/* Icon */}
                                    <div className={`w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 ${problem.iconColor}`}>
                                        <problem.icon className="w-8 h-8" />
                                    </div>

                                    {/* Content */}
                                    <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 transition-all duration-300">
                                        {problem.title}
                                    </h3>
                                    <p className="text-gray-300 leading-relaxed text-lg">
                                        {problem.before}
                                    </p>

                                    {/* Glow Effect */}
                                    <div className={`absolute -inset-1 bg-gradient-to-r ${problem.color} rounded-3xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500 -z-10`} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Decorative Elements */}
                <div className="mt-20 text-center">
                    <div className="inline-flex items-center gap-4 px-8 py-4 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                        <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                        <span className="text-gray-400 text-sm">Каждая из этих проблем решается нашей платформой</span>
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    </div>
                </div>
            </div>
        </section>
    );
};

