import React from 'react';
import { Sparkles, Github, Twitter, Mail } from 'lucide-react';

export const UltraFooter: React.FC = () => {
    return (
        <footer className="relative py-16 border-t border-white/10">
            {/* Gradient Divider */}
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

            <div className="container mx-auto px-4">
                <div className="max-w-6xl mx-auto">
                    {/* Main Footer Content */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                        {/* Brand */}
                        <div className="md:col-span-2">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500">
                                    <Sparkles className="w-6 h-6 text-white" />
                                </div>
                                <span className="text-2xl font-bold">
                                    <span className="text-white">Bugrov</span>
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">.Space</span>
                                </span>
                            </div>
                            <p className="text-gray-400 text-lg max-w-md leading-relaxed">
                                Превращаем идеи в код с помощью автономных AI-агентов.
                                Быстро, качественно, без лишних сложностей.
                            </p>
                        </div>

                        {/* Quick Links */}
                        <div>
                            <h4 className="text-white font-bold mb-4">Быстрые ссылки</h4>
                            <ul className="space-y-3">
                                {[
                                    { label: 'О платформе', href: '#features' },
                                    { label: 'Цены', href: '#pricing' },
                                    { label: 'FAQ', href: '#faq' },
                                    { label: 'Документация', href: '#' },
                                ].map((link, i) => (
                                    <li key={i}>
                                        <a
                                            href={link.href}
                                            className="text-gray-400 hover:text-white transition-colors duration-300 hover:translate-x-1 inline-block"
                                        >
                                            {link.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Legal */}
                        <div>
                            <h4 className="text-white font-bold mb-4">Правовая информация</h4>
                            <ul className="space-y-3">
                                {[
                                    { label: 'Политика конфиденциальности', href: '#/privacy' },
                                    { label: 'Условия использования', href: '#/offer' },
                                    { label: 'Реквизиты', href: '#/requisites' },
                                ].map((link, i) => (
                                    <li key={i}>
                                        <a
                                            href={link.href}
                                            className="text-gray-400 hover:text-white transition-colors duration-300 hover:translate-x-1 inline-block"
                                        >
                                            {link.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Social Links */}
                    <div className="flex items-center justify-between pt-8 border-t border-white/10">
                        <div className="text-gray-400 text-sm">
                            © {new Date().getFullYear()} Bugrov.Space. Все права защищены.
                        </div>
                        <div className="flex items-center gap-4">
                            {[
                                { icon: Github, href: '#', label: 'GitHub' },
                                { icon: Twitter, href: '#', label: 'Twitter' },
                                { icon: Mail, href: '#', label: 'Email' },
                            ].map((social, i) => (
                                <a
                                    key={i}
                                    href={social.href}
                                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20 hover:scale-110 transition-all duration-300"
                                    aria-label={social.label}
                                >
                                    <social.icon className="w-5 h-5" />
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};



