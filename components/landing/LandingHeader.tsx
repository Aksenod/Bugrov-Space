import React from 'react';
import { Sparkles } from 'lucide-react';

export const LandingHeader: React.FC = () => {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold">
                            <span className="text-white">Bugrov</span>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">.Space</span>
                        </span>
                    </div>

                    {/* Auth Buttons */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => window.location.hash = '#/auth'}
                            className="hidden sm:inline-flex px-4 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors"
                        >
                            Вход
                        </button>
                        <button
                            onClick={() => window.location.hash = '#/auth'}
                            className="inline-flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-2.5 bg-white text-black rounded-full font-bold text-sm hover:bg-indigo-50 transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
                        >
                            Регистрация
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
};
