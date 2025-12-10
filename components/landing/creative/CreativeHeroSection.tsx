import React from 'react';
import { ArrowRight, Sparkles, Zap } from 'lucide-react';
import { EXAMPLE_PROTOTYPE_URL } from '../../../utils/constants';

interface CreativeHeroSectionProps {
    isAuthenticated?: boolean;
    onOpenPayment: () => void;
}

export const CreativeHeroSection: React.FC<CreativeHeroSectionProps> = ({ isAuthenticated, onOpenPayment }) => {
    const handleViewExample = () => {
        window.location.hash = EXAMPLE_PROTOTYPE_URL;
    };
    return (
        <section className="relative min-h-screen flex items-center justify-center pt-20 overflow-hidden">
            {/* Dynamic Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-full blur-[100px] animate-spin-slow" />
            </div>

            <div className="container mx-auto px-4 relative z-10 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8 hover:bg-white/10 transition-colors cursor-default">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm font-medium text-gray-300">AI-Powered Development Revolution</span>
                </div>

                <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-8 leading-tight">
                    <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-400">
                        Build Faster.
                    </span>
                    <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 animate-gradient-x">
                        Think Bigger.
                    </span>
                </h1>

                <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed">
                    Transform your ideas into reality with our autonomous AI agent swarms.
                    From concept to code in minutes, not months.
                </p>

                <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                    <button
                        onClick={onOpenPayment}
                        className="group relative px-8 py-4 bg-white text-black rounded-full font-bold text-lg hover:scale-105 transition-transform duration-200 overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                        <span className="relative flex items-center gap-2 group-hover:text-white transition-colors">
                            Start Building Now <ArrowRight className="w-5 h-5" />
                        </span>
                    </button>

                    <button 
                        onClick={handleViewExample}
                        className="px-8 py-4 rounded-full font-bold text-lg text-white border border-white/20 hover:bg-white/5 transition-colors flex items-center gap-2"
                    >
                        <Zap className="w-5 h-5 text-yellow-400" />
                        View Demo
                    </button>
                </div>

                {/* Stats / Social Proof */}
                <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-white/10 pt-12 max-w-4xl mx-auto">
                    {[
                        { label: 'Agents Active', value: '500+' },
                        { label: 'Lines of Code', value: '1M+' },
                        { label: 'Time Saved', value: '10k hrs' },
                        { label: 'Happy Users', value: '100%' }
                    ].map((stat, index) => (
                        <div key={index} className="text-center">
                            <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                            <div className="text-sm text-gray-500 uppercase tracking-wider">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
