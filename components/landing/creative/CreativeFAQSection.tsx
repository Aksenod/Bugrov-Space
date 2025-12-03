import React, { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

export const CreativeFAQSection: React.FC = () => {
    const faqs = [
        {
            q: "How do AI agents work?",
            a: "Our agents are autonomous programs powered by large language models. They can understand instructions, write code, and test their own work."
        },
        {
            q: "Can I export the code?",
            a: "Yes! You own 100% of the code generated. You can export it to GitHub or download it as a zip file at any time."
        },
        {
            q: "Is my data secure?",
            a: "Absolutely. We use enterprise-grade encryption and never train our models on your private code without your explicit permission."
        },
        {
            q: "Do I need to know how to code?",
            a: "Not necessarily. You can build entire applications using natural language. However, knowing code helps if you want to customize deeply."
        }
    ];

    return (
        <section className="py-24 relative">
            <div className="container mx-auto px-4 max-w-3xl">
                <h2 className="text-4xl font-bold text-center mb-12">Common Questions</h2>

                <div className="space-y-4">
                    {faqs.map((faq, index) => (
                        <FAQItem key={index} question={faq.q} answer={faq.a} />
                    ))}
                </div>
            </div>
        </section>
    );
};

const FAQItem: React.FC<{ question: string; answer: string }> = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden transition-colors hover:bg-white/10">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full p-6 flex items-center justify-between text-left"
            >
                <span className="text-lg font-medium text-white">{question}</span>
                {isOpen ? <Minus className="w-5 h-5 text-gray-400" /> : <Plus className="w-5 h-5 text-gray-400" />}
            </button>

            <div
                className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}
            >
                <div className="p-6 pt-0 text-gray-400 leading-relaxed">
                    {answer}
                </div>
            </div>
        </div>
    );
};
