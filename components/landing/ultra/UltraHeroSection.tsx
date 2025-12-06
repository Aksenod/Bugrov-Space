import React, { useEffect, useRef } from 'react';
import { ArrowRight, Sparkles, Zap, Rocket, Code, Users } from 'lucide-react';
import { CURRENT_PRICE, FUTURE_PRICE, IS_BETA_PRICING } from '../../../utils/constants';

interface UltraHeroSectionProps {
    isAuthenticated?: boolean;
    onOpenPayment: () => void;
}

export const UltraHeroSection: React.FC<UltraHeroSectionProps> = ({ isAuthenticated, onOpenPayment }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const particles: Array<{
            x: number;
            y: number;
            vx: number;
            vy: number;
            size: number;
            opacity: number;
        }> = [];

        for (let i = 0; i < 50; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                size: Math.random() * 2 + 1,
                opacity: Math.random() * 0.5 + 0.2,
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach(particle => {
                particle.x += particle.vx;
                particle.y += particle.vy;

                if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
                if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(139, 92, 246, ${particle.opacity})`;
                ctx.fill();
            });

            requestAnimationFrame(animate);
        };

        animate();

        const handleResize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
            {/* Animated Canvas Background */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 pointer-events-none opacity-30"
            />

            {/* Dynamic Gradient Orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px] animate-blob" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] animate-blob" style={{ animationDelay: '2s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-500/10 rounded-full blur-[150px] animate-pulse-slow" />
            </div>

            <div className="container mx-auto px-4 relative z-10">
                <div className="max-w-6xl mx-auto">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 backdrop-blur-md mb-10 hover:scale-105 transition-transform cursor-default group">
                        <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />
                        <span className="text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-blue-300">
                            Для UX/UI дизайнеров и мини‑студий
                        </span>
                    </div>

                    {/* Main Headline - Non-linear Typography */}
                    <div className="mb-12">
                        <h1 className="text-7xl md:text-9xl font-black tracking-tight leading-none mb-6">
                            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-white animate-gradient-x">
                                Прототип проекта
                            </span>
                            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 mt-2 md:mt-4">
                                за 15 минут
                            </span>
                            <span className="block text-6xl md:text-8xl text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 mt-2 md:mt-4">
                                вместо недели
                            </span>
                        </h1>
                        <p className="text-2xl md:text-3xl text-gray-300 max-w-3xl mt-8 leading-relaxed font-light">
                            Bugrov.Space — AI‑платформа для UX/UI дизайнеров и мини‑студий. Готовые связки агентов под разные задачи: лендинги, сайты, портфолио, приложения, сервисы, продвижение в соцсетях.
                            <span className="block mt-2 text-xl md:text-2xl text-gray-400">
                                Выбираете сценарий → проходите по связке агентов → получаете готовый прототип.
                            </span>
                        </p>
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex flex-col items-center justify-center gap-4 mb-16">
                        <button
                            onClick={onOpenPayment}
                            className="group relative px-10 py-5 bg-white text-black rounded-2xl font-bold text-lg hover:bg-indigo-50 hover:scale-105 transition-all duration-300 overflow-hidden shadow-2xl shadow-white/20"
                        >
                            <span className="relative flex items-center gap-3">
                                Подключить — {CURRENT_PRICE} ₽/мес <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </span>
                        </button>
                        <div className="flex flex-col items-center gap-2">
                            {IS_BETA_PRICING && (
                                <div className="flex items-center gap-3 text-sm">
                                    <span className="text-white font-semibold">{CURRENT_PRICE} ₽</span>
                                    <span className="text-gray-500 line-through">{FUTURE_PRICE} ₽</span>
                                    <span className="px-3 py-1 bg-gradient-to-r from-amber-500/30 to-orange-500/30 text-amber-300 rounded-full text-xs font-semibold border border-amber-500/40 animate-pulse">
                                        Бета-цена
                                    </span>
                                </div>
                            )}
                            <p className="text-sm text-gray-400 text-center">Отмена в любой момент</p>
                        </div>
                    </div>

                    {/* Trust elements */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-20">
                        <div className="group text-left p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                            <div className="flex items-center gap-3 mb-2">
                                <Users className="w-6 h-6 text-indigo-400" />
                                <h3 className="text-lg font-semibold text-white">Для кого</h3>
                            </div>
                            <p className="text-gray-300 text-sm">
                                Для UX/UI дизайнеров, no‑code веб‑мастеров и мини‑студий 1–5 человек
                            </p>
                        </div>
                        <div className="group text-left p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300">
                            <div className="flex items-center gap-3 mb-2">
                                <Zap className="w-6 h-6 text-indigo-400" />
                                <h3 className="text-lg font-semibold text-white">Результаты</h3>
                            </div>
                            <p className="text-gray-300 text-sm">
                                Уже сгенерировано 100+ прототипов по разным сценариям
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
                <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2">
                    <div className="w-1.5 h-3 rounded-full bg-white/50 animate-pulse" />
                </div>
            </div>
        </section>
    );
};

