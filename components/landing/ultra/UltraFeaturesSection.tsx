import React, { useEffect, useRef, useState } from 'react';
import { Brain, Zap, Shield, Infinity, Sparkles, Layers, Globe } from 'lucide-react';

export const UltraFeaturesSection: React.FC = () => {
    const sectionRef = useRef<HTMLDivElement>(null);
    const [visibleFeatures, setVisibleFeatures] = useState<Set<number>>(new Set());

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const index = parseInt(entry.target.getAttribute('data-index') || '0');
                        setVisibleFeatures((prev) => new Set([...prev, index]));
                    }
                });
            },
            { threshold: 0.2 }
        );

        const elements = sectionRef.current?.querySelectorAll('[data-index]');
        elements?.forEach((el) => observer.observe(el));

        return () => observer.disconnect();
    }, []);

    const features = [
        {
            icon: Brain,
            title: "Умные агенты",
            description: "Каждый агент — эксперт в своей области. Они работают вместе, как слаженная команда профессионалов.",
            gradient: "from-purple-500 to-pink-500",
            position: "md:col-span-2 md:row-span-1",
            tilt: { x: -5, y: 5 },
        },
        {
            icon: Zap,
            title: "Молниеносная скорость",
            description: "От идеи до рабочего прототипа за минуты. Не дни, не недели — буквально минуты.",
            gradient: "from-yellow-500 to-orange-500",
            position: "md:col-span-1",
            tilt: { x: 5, y: -5 },
        },
        {
            icon: Shield,
            title: "Надёжность",
            description: "Автоматическое тестирование и проверка качества на каждом этапе. Код готов к продакшену.",
            gradient: "from-blue-500 to-cyan-500",
            position: "md:col-span-1",
            tilt: { x: -5, y: -5 },
        },
        {
            icon: Infinity,
            title: "Без ограничений",
            description: "Создавайте столько проектов, сколько нужно. Масштабируйте без дополнительных затрат.",
            gradient: "from-green-500 to-emerald-500",
            position: "md:col-span-1",
            tilt: { x: 5, y: 5 },
        },
        {
            icon: Sparkles,
            title: "Постоянные обновления",
            description: "Платформа улучшается каждый день. Новые возможности появляются автоматически.",
            gradient: "from-pink-500 to-rose-500",
            position: "md:col-span-1",
            tilt: { x: -5, y: 5 },
        },
        {
            icon: Layers,
            title: "Любой стек",
            description: "Работайте с любыми технологиями. React, Vue, Python, Node.js — что угодно.",
            gradient: "from-indigo-500 to-purple-500",
            position: "md:col-span-2",
            tilt: { x: 5, y: -5 },
        },
        {
            icon: Globe,
            title: "Доступ везде",
            description: "Работайте из любой точки мира. Всё в облаке, всё синхронизировано, всё доступно.",
            gradient: "from-cyan-500 to-blue-500",
            position: "md:col-span-3",
            tilt: { x: 0, y: 0 },
        },
    ];

    return (
        <section ref={sectionRef} className="py-32 relative overflow-hidden">
            {/* Parallax Background */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] animate-blob" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] animate-blob" style={{ animationDelay: '2s' }} />
            </div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center mb-20">
                    <h2 className="text-5xl md:text-7xl font-black mb-8 leading-tight">
                        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400">
                            Возможности
                        </span>
                        <span className="block text-white mt-2">
                            которые меняют всё
                        </span>
                    </h2>
                    <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto">
                        Всё, что нужно для создания современных приложений, в одной платформе.
                    </p>
                </div>

                {/* Non-linear Grid with 3D Tilt */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
                    {features.map((feature, index) => {
                        const isVisible = visibleFeatures.has(index);

                        return (
                            <div
                                key={index}
                                data-index={index}
                                className={`group relative ${feature.position} transition-all duration-700 ${
                                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                                }`}
                                style={{
                                    transitionDelay: `${index * 100}ms`,
                                }}
                            >
                                <div
                                    className="relative p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md overflow-hidden h-full transition-all duration-500 hover:border-white/30"
                                    style={{
                                        transform: 'perspective(1000px)',
                                        transformStyle: 'preserve-3d',
                                    }}
                                    onMouseMove={(e) => {
                                        const card = e.currentTarget;
                                        const rect = card.getBoundingClientRect();
                                        const x = e.clientX - rect.left;
                                        const y = e.clientY - rect.top;
                                        const centerX = rect.width / 2;
                                        const centerY = rect.height / 2;
                                        const rotateX = ((y - centerY) / centerY) * feature.tilt.x;
                                        const rotateY = ((centerX - x) / centerX) * feature.tilt.y;

                                        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(10px)`;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0px)';
                                    }}
                                >
                                    {/* Gradient Background */}
                                    <div
                                        className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
                                    />

                                    {/* Shimmer Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                                    {/* Icon */}
                                    <div
                                        className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300 shadow-lg`}
                                    >
                                        <feature.icon className="w-8 h-8 text-white" />
                                    </div>

                                    {/* Content */}
                                    <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 transition-all duration-300">
                                        {feature.title}
                                    </h3>
                                    <p className="text-gray-300 leading-relaxed text-lg">
                                        {feature.description}
                                    </p>

                                    {/* Glow on Hover */}
                                    <div
                                        className={`absolute -inset-1 bg-gradient-to-r ${feature.gradient} rounded-3xl blur-xl opacity-0 group-hover:opacity-30 transition-opacity duration-500 -z-10`}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Bottom Decoration */}
                <div className="mt-20 text-center">
                    <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        <span className="text-gray-400 text-sm">И это только начало. Новые возможности появляются каждую неделю.</span>
                        <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                    </div>
                </div>
            </div>
        </section>
    );
};


