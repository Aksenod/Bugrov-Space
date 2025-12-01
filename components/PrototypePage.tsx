import React, { useState, useEffect } from 'react';
import { Loader2, Copy, CheckCheck, ExternalLink, ArrowLeft } from 'lucide-react';
import { api } from '../services/api';

interface PrototypePageProps {
    documentId?: string;
}

export const PrototypePage: React.FC<PrototypePageProps> = ({ documentId: propDocumentId }) => {
    const [documentId, setDocumentId] = useState<string | null>(propDocumentId || null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [prototypeData, setPrototypeData] = useState<{
        id: string;
        name: string;
        html: string;
        project: { id: string; name: string } | null;
    } | null>(null);
    const [linkCopied, setLinkCopied] = useState(false);

    useEffect(() => {
        // Если ID не передан в пропсах, пытаемся достать из хэша
        if (!propDocumentId) {
            const hash = window.location.hash;
            if (hash.startsWith('#/prototype/')) {
                setDocumentId(hash.replace('#/prototype/', ''));
            }
        } else {
            setDocumentId(propDocumentId);
        }
    }, [propDocumentId]);

    useEffect(() => {
        const loadPrototype = async () => {
            if (!documentId) {
                // Если ID все еще нет, ждем или показываем ошибку
                if (!isLoading) setIsLoading(true); // Keep loading until we check hash
                return;
            }

            try {
                setIsLoading(true);
                setError(null);
                const { prototype } = await api.getPublicPrototype(documentId);
                setPrototypeData(prototype);
            } catch (err: any) {
                console.error('Failed to load prototype:', err);
                setError(err?.message || 'Не удалось загрузить прототип');
            } finally {
                setIsLoading(false);
            }
        };

        loadPrototype();
    }, [documentId]);

    const handleCopyLink = async () => {
        try {
            // Формируем ссылку на основе текущего origin и хэша
            const url = `${window.location.origin}/#/prototype/${documentId}`;
            await navigator.clipboard.writeText(url);
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy link:', err);
        }
    };

    const handleOpenInNewTab = () => {
        if (prototypeData?.html) {
            const newWindow = window.open('', '_blank');
            if (newWindow) {
                newWindow.document.write(prototypeData.html);
                newWindow.document.close();
            }
        }
    };

    const handleBack = () => {
        window.location.hash = '';
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-black via-black to-indigo-950/20 flex flex-col items-center justify-center">
                <div className="text-center">
                    <Loader2 size={48} className="text-indigo-400 animate-spin mx-auto mb-4" />
                    <p className="text-white/60 text-lg">Загрузка прототипа...</p>
                </div>
            </div>
        );
    }

    if (error || !prototypeData) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-black via-black to-indigo-950/20 flex flex-col items-center justify-center p-6">
                <div className="max-w-md w-full bg-black/40 border border-white/10 rounded-2xl p-8 text-center">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">⚠️</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Ошибка</h1>
                    <p className="text-white/60 mb-6">
                        {error || 'Прототип не найден или ID не указан'}
                    </p>
                    <button
                        onClick={handleBack}
                        className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-colors flex items-center gap-2 mx-auto"
                    >
                        <ArrowLeft size={18} />
                        На главную
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-black via-black to-indigo-950/20 flex flex-col">
            {/* Header */}
            <div className="bg-black/60 backdrop-blur-xl border-b border-white/10 shrink-0">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                        <button
                            onClick={handleBack}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white shrink-0"
                            title="На главную"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div className="min-w-0">
                            <h1 className="text-lg sm:text-xl font-bold text-white truncate">
                                {prototypeData.name}
                            </h1>
                            {prototypeData.project && (
                                <p className="text-sm text-white/50 truncate">
                                    Проект: {prototypeData.project.name}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={handleOpenInNewTab}
                            className="px-3 py-2 sm:px-4 sm:py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                            title="Открыть в отдельном окне"
                        >
                            <ExternalLink size={16} />
                            <span className="hidden sm:inline">Открыть отдельно</span>
                        </button>
                        <button
                            onClick={handleCopyLink}
                            className="px-3 py-2 sm:px-4 sm:py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                            title="Скопировать ссылку"
                        >
                            {linkCopied ? (
                                <>
                                    <CheckCheck size={16} />
                                    <span className="hidden sm:inline">Скопировано!</span>
                                </>
                            ) : (
                                <>
                                    <Copy size={16} />
                                    <span className="hidden sm:inline">Копировать ссылку</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Prototype content */}
            <div className="flex-1 relative">
                <iframe
                    srcDoc={prototypeData.html}
                    className="absolute inset-0 w-full h-full border-0"
                    title="HTML Preview"
                    sandbox="allow-same-origin allow-scripts"
                />
            </div>
        </div>
    );
};
