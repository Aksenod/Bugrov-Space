import React, { useState } from 'react';
import { X, CreditCard, Check, Loader2 } from 'lucide-react';
import { api } from '../services/api';

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    token: string;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, token }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handlePayment = async () => {
        // Check if user is authenticated
        if (!token) {
            window.location.hash = '#/auth';
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const data = await api.createPayment({
                amount: '1000.00',
                description: 'Подписка на Bugrov Space',
            });

            if (data.confirmationUrl) {
                window.location.href = data.confirmationUrl;
            } else {
                throw new Error('No confirmation URL received');
            }
        } catch (err: any) {
            setError(err.message || 'Произошла ошибка при создании платежа');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget && !isLoading) {
            onClose();
        }
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
            onClick={handleBackdropClick}
        >
            <div className="relative w-full max-w-md mx-4 bg-gradient-to-b from-black/90 via-black/80 to-black/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden">
                {/* Decorative gradient overlay */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500/50 via-indigo-400/30 to-transparent" />
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                    <h2 className="text-xl font-bold text-white">Оформление подписки</h2>
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10">
                            <div className="p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                                <CreditCard className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-white">Полный доступ</h3>
                                <p className="text-sm text-white/60">Доступ ко всем функциям платформы</p>
                            </div>
                            <div className="ml-auto font-bold text-white">
                                1000 ₽ <span className="text-xs text-white/50 font-normal">/ мес</span>
                            </div>
                        </div>

                        <ul className="space-y-3">
                            {[
                                'Неограниченное создание проектов и прототипов.',
                                'Платформа работает на моделях GPT‑5.1 — оплата за модели уже включена в подписку, свои ключи не нужны.',
                                'Поддержка напрямую от автора сервиса.',
                                'Ранний доступ к новым сценариям и функциям платформы.'
                            ].map((feature, i) => (
                                <li key={i} className="flex items-start gap-3 text-sm text-white/80 leading-relaxed">
                                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                    <span>{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handlePayment}
                        disabled={isLoading}
                        className="w-full py-3 px-4 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Обработка...
                            </>
                        ) : (
                            'Оплатить подписку'
                        )}
                    </button>

                    <p className="text-xs text-center text-white/40">
                        Нажимая кнопку, вы соглашаетесь с условиями оферты и правилами обработки персональных данных
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
