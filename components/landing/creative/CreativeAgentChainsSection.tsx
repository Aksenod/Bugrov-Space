import React from 'react';
import { ArrowRight, FileText, Code, CheckCircle, Rocket } from 'lucide-react';

export const CreativeAgentChainsSection: React.FC = () => {
    const steps = [
        {
            icon: FileText,
            title: "Input",
            desc: "Describe your idea in plain English.",
            color: "text-blue-400"
        },
        {
            icon: Code,
            title: "Processing",
            desc: "Agents analyze, plan, and write code.",
            color: "text-purple-400"
        },
        {
            icon: CheckCircle,
            title: "Verification",
            desc: "Automated testing and refinement.",
            color: "text-pink-400"
        },
        {
            icon: Rocket,
            title: "Deploy",
            desc: "Live production-ready application.",
            color: "text-green-400"
        }
    ];

    return (
        <section className="py-32 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/10 to-transparent" />

            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center mb-20">
                    <h2 className="text-4xl md:text-6xl font-black mb-6">
                        The <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Magic</span> Behind It
                    </h2>
                    <p className="text-xl text-gray-400">Autonomous agent chains that work in perfect harmony.</p>
                </div>

                <div className="relative">
                    {/* Connecting Line */}
                    <div className="hidden md:block absolute top-1/2 left-0 w-full h-1 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-green-500/20 -translate-y-1/2" />

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        {steps.map((step, index) => (
                            <div key={index} className="relative group">
                                <div className="bg-[#0a0a0a] relative z-10 p-6 rounded-2xl border border-white/10 hover:border-white/30 transition-colors text-center">
                                    <div className={`w-16 h-16 mx-auto rounded-full bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 ring-1 ring-white/10`}>
                                        <step.icon className={`w-8 h-8 ${step.color}`} />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                                    <p className="text-sm text-gray-400">{step.desc}</p>
                                </div>

                                {/* Mobile Arrow */}
                                {index < steps.length - 1 && (
                                    <div className="md:hidden flex justify-center py-4">
                                        <ArrowRight className="text-white/20" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};
