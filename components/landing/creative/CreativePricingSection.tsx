import React from 'react';
import { Check } from 'lucide-react';

interface CreativePricingSectionProps {
    isAuthenticated?: boolean;
    onOpenPayment: () => void;
}

export const CreativePricingSection: React.FC<CreativePricingSectionProps> = ({ isAuthenticated, onOpenPayment }) => {
    return (
        <section className="py-24 relative">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">Simple Pricing</h2>
                    <p className="text-gray-400 text-xl">Start for free, scale when you're ready.</p>
                </div>

                <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                    {/* Starter Plan */}
                    <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm">
                        <h3 className="text-xl font-bold text-gray-300 mb-2">Starter</h3>
                        <div className="text-4xl font-bold text-white mb-6">$0<span className="text-lg text-gray-500 font-normal">/mo</span></div>
                        <ul className="space-y-4 mb-8">
                            {['1 Project', 'Basic Agents', 'Community Support'].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-gray-400">
                                    <Check className="w-5 h-5 text-gray-600" /> {item}
                                </li>
                            ))}
                        </ul>
                        <button className="w-full py-3 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors">
                            Get Started
                        </button>
                    </div>

                    {/* Pro Plan - Highlighted */}
                    <div className="relative p-8 rounded-3xl bg-gradient-to-b from-purple-900/40 to-blue-900/40 border border-purple-500/30 backdrop-blur-md transform md:-translate-y-4">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg shadow-purple-500/20">
                            MOST POPULAR
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Pro</h3>
                        <div className="text-5xl font-bold text-white mb-6">$49<span className="text-lg text-gray-400 font-normal">/mo</span></div>
                        <ul className="space-y-4 mb-8">
                            {['Unlimited Projects', 'Advanced GPT-4 Agents', 'Priority Support', 'API Access', 'Custom Workflows'].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-white">
                                    <Check className="w-5 h-5 text-green-400" /> {item}
                                </li>
                            ))}
                        </ul>
                        <button
                            onClick={onOpenPayment}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold hover:shadow-lg hover:shadow-purple-500/25 transition-all hover:scale-[1.02]"
                        >
                            Upgrade to Pro
                        </button>
                    </div>

                    {/* Enterprise Plan */}
                    <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm">
                        <h3 className="text-xl font-bold text-gray-300 mb-2">Enterprise</h3>
                        <div className="text-4xl font-bold text-white mb-6">Custom</div>
                        <ul className="space-y-4 mb-8">
                            {['Dedicated Infrastructure', 'SLA', 'Custom Agents', 'On-premise Option'].map((item, i) => (
                                <li key={i} className="flex items-center gap-3 text-gray-400">
                                    <Check className="w-5 h-5 text-gray-600" /> {item}
                                </li>
                            ))}
                        </ul>
                        <button className="w-full py-3 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors">
                            Contact Sales
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};
