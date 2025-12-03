import React, { useState } from 'react';
import { X, CreditCard, Check, Loader2 } from 'lucide-react';

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
            const response = await fetch('http://localhost:3000/api/payment/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    amount: 1000.00,
                    description: 'Подписка на Bugrov Space',
                    returnUrl: window.location.href,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to initiate payment');
            }

            const data = await response.json();
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

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-800">
                    <h2 className="text-xl font-semibold text-white">Оформление подписки</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
                            <div className="p-3 bg-indigo-500/10 rounded-lg">
                                <CreditCard className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="font-medium text-white">Полный доступ</h3>
                                <p className="text-sm text-gray-400">Доступ ко всем функциям платформы</p>
                            </div>
                            <div className="ml-auto font-semibold text-white">
                                1000 ₽ <span className="text-xs text-gray-500 font-normal">/ мес</span>
                            </div>
                        </div>

                        <ul className="space-y-3">
                            {[
                                'Неограниченное создание агентов и запуск сценариев (fair‑use).',
                                'Платформа работает на моделях GPT‑5.1 — оплата за модели уже включена в подписку, свои ключи не нужны.',
                                'Поддержка напрямую от автора сервиса.',
                                'Ранний доступ к новым сценариям и функциям платформы.'
                            ].map((feature, i) => (
                                <li key={i} className="flex items-center gap-3 text-sm text-gray-300">
                                    <Check className="w-4 h-4 text-green-400 shrink-0" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {error && (
                        <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handlePayment}
                        disabled={isLoading}
                        className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

                    <p className="text-xs text-center text-gray-500">
                        Нажимая кнопку, вы соглашаетесь с условиями оферты и правилами обработки персональных данных
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
