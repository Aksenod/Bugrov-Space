import React from 'react';
import { Clock, DollarSign, Code2, BrainCircuit } from 'lucide-react';

export const CreativePainPointsSection: React.FC = () => {
    const points = [
        {
            icon: Clock,
            title: "Development Takes Forever",
            description: "Traditional coding cycles are slow. We cut months of work into days.",
            color: "text-blue-400",
            bg: "bg-blue-500/10"
        },
        {
            icon: DollarSign,
            title: "Budgets Spiral Out of Control",
            description: "Hiring a full dev team is expensive. AI agents cost a fraction of the price.",
            color: "text-green-400",
            bg: "bg-green-500/10"
        },
        {
            icon: Code2,
            title: "Legacy Code Nightmares",
            description: "Maintaining old codebases is painful. Let AI refactor and modernize for you.",
            color: "text-purple-400",
            bg: "bg-purple-500/10"
        },
        {
            icon: BrainCircuit,
            title: "Complexity Overload",
            description: "Modern stacks are complex. Our agents handle the architecture so you don't have to.",
            color: "text-pink-400",
            bg: "bg-pink-500/10"
        }
    ];

    return (
        <section className="py-24 relative">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">
                        Stop <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">Struggling</span>.
                        <br />
                        Start <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">Shipping</span>.
                    </h2>
                    <p className="text-gray-400 text-xl max-w-2xl mx-auto">
                        The old way of building software is broken. Here's how we fix it.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {points.map((point, index) => (
                        <div
                            key={index}
                            className="group relative p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 hover:-translate-y-2"
                        >
                            <div className={`w-14 h-14 rounded-2xl ${point.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                                <point.icon className={`w-7 h-7 ${point.color}`} />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-white">{point.title}</h3>
                            <p className="text-gray-400 leading-relaxed">{point.description}</p>

                            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
