import React from 'react';
import { Sparkles } from 'lucide-react';

interface LandingHeaderProps {
    isAuthenticated?: boolean;
    username?: string;
    onOpenCabinet?: () => void;
}

export const LandingHeader: React.FC<LandingHeaderProps> = ({ isAuthenticated, username, onOpenCabinet }) => {
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

                    {/* Auth Button or User Info */}
                    <div className="flex items-center gap-4">
                        {isAuthenticated ? (
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-white/80 hidden sm:block">
                                    {username}
                                </span>
                                <button
                                    onClick={onOpenCabinet}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-full font-medium text-sm hover:bg-white/20 transition-all border border-white/20 hover:border-white/30"
                                >
                                    В кабинет
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => window.location.hash = '#/auth'}
                                className="inline-flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-2.5 bg-white/10 text-white rounded-full font-medium text-sm hover:bg-white/20 transition-all border border-white/20 hover:border-white/30"
                            >
                                Вход
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};
