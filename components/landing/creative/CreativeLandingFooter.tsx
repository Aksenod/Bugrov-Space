import React from 'react';
import { Github, Twitter, Linkedin, Heart } from 'lucide-react';

export const CreativeLandingFooter: React.FC = () => {
    return (
        <footer className="py-12 border-t border-white/10 bg-black/50 backdrop-blur-lg">
            <div className="container mx-auto px-4">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">

                    <div className="text-center md:text-left">
                        <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500 mb-2">
                            Bugrov Space
                        </div>
                        <p className="text-gray-500 text-sm">
                            Building the future of software development.
                        </p>
                    </div>

                    <div className="flex items-center gap-6">
                        {[Github, Twitter, Linkedin].map((Icon, i) => (
                            <a key={i} href="#" className="p-2 rounded-full bg-white/5 hover:bg-white/10 hover:text-white text-gray-400 transition-all hover:scale-110">
                                <Icon className="w-5 h-5" />
                            </a>
                        ))}
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-white/5 text-center text-gray-600 text-sm flex items-center justify-center gap-2">
                    <span>Made with</span>
                    <Heart className="w-4 h-4 text-red-500 fill-red-500 animate-pulse" />
                    <span>by Denis Bugrov</span>
                </div>
            </div>
        </footer>
    );
};
