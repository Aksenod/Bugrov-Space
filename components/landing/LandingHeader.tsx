import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Menu, X, User, LogOut, ChevronDown } from 'lucide-react';

interface LandingHeaderProps {
    isAuthenticated?: boolean;
    username?: string;
    onOpenCabinet?: () => void;
    onLogout?: () => void;
}

export const LandingHeader: React.FC<LandingHeaderProps> = ({ isAuthenticated, username, onOpenCabinet, onLogout }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setIsMobileMenuOpen(false);
        }
    };

    // Закрытие dropdown при клике вне его
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
            }
        };

        if (isUserMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isUserMenuOpen]);

    const navItems = [
        { label: 'Тарифы', id: 'pricing' },
        { label: 'FAQ', id: 'faq' },
    ];

    return (
        <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                    {/* Logo */}
                    <button
                        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                    >
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold">
                            <span className="text-white">Bugrov</span>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">.Space</span>
                        </span>
                    </button>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-6">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => scrollToSection(item.id)}
                                className="text-sm text-white/70 hover:text-white transition-colors font-medium"
                            >
                                {item.label}
                            </button>
                        ))}
                    </nav>

                    {/* Auth Button or User Info */}
                    <div className="flex items-center gap-3">
                        {isAuthenticated ? (
                            <div className="relative" ref={userMenuRef}>
                                {/* User Menu Trigger */}
                                <button
                                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                    className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
                                >
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-xs font-bold">
                                        {username ? username.charAt(0).toUpperCase() : 'U'}
                                    </div>
                                    <span className="hidden sm:block text-sm font-medium text-white/90">
                                        {username}
                                    </span>
                                    <ChevronDown className={`w-4 h-4 text-white/60 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Dropdown Menu */}
                                {isUserMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-56 rounded-xl bg-black/95 backdrop-blur-xl border border-white/20 shadow-2xl overflow-hidden z-50">
                                        <div className="py-2">
                                            {/* User Info */}
                                            <div className="px-4 py-3 border-b border-white/10">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-sm font-bold">
                                                        {username ? username.charAt(0).toUpperCase() : 'U'}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-semibold text-white">{username}</div>
                                                        <div className="text-xs text-white/60">Авторизован</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Menu Items */}
                                            <button
                                                onClick={() => {
                                                    onOpenCabinet?.();
                                                    setIsUserMenuOpen(false);
                                                }}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/90 hover:bg-white/10 transition-colors"
                                            >
                                                <User className="w-4 h-4 text-white/70" />
                                                <span>В кабинет</span>
                                            </button>

                                            {/* Logout */}
                                            <div className="border-t border-white/10 mt-1 pt-1">
                                                <button
                                                    onClick={() => {
                                                        onLogout?.();
                                                        setIsUserMenuOpen(false);
                                                    }}
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                                                >
                                                    <LogOut className="w-4 h-4" />
                                                    <span>Выйти</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <button
                                    onClick={() => scrollToSection('pricing')}
                                    className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-white/80 hover:text-white transition-colors text-sm font-medium"
                                >
                                    Тарифы
                                </button>
                                <button
                                    onClick={() => window.location.hash = '#/auth'}
                                    className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-white/80 hover:text-white transition-colors text-sm font-medium"
                                >
                                    Регистрация
                                </button>
                                <button
                                    onClick={() => window.location.hash = '#/auth'}
                                    className="inline-flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-2.5 bg-white text-black rounded-full font-semibold text-sm hover:bg-indigo-50 transition-all shadow-sm hover:shadow-md"
                                >
                                    Войти
                                </button>
                            </>
                        )}
                        
                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="md:hidden p-2 text-white/70 hover:text-white transition-colors"
                            aria-label="Toggle menu"
                        >
                            {isMobileMenuOpen ? (
                                <X className="w-5 h-5" />
                            ) : (
                                <Menu className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden border-t border-white/10 py-4">
                        <nav className="flex flex-col gap-3">
                            {navItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => scrollToSection(item.id)}
                                    className="text-left text-sm text-white/70 hover:text-white transition-colors font-medium py-2"
                                >
                                    {item.label}
                                </button>
                            ))}
                            {!isAuthenticated && (
                                <button
                                    onClick={() => {
                                        window.location.hash = '#/auth';
                                        setIsMobileMenuOpen(false);
                                    }}
                                    className="text-left text-sm text-white font-medium py-2"
                                >
                                    Войти
                                </button>
                            )}
                        </nav>
                    </div>
                )}
            </div>
        </header>
    );
};
