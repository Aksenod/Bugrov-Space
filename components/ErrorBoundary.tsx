import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary компонент для обработки ошибок рендеринга
 * Показывает понятное сообщение об ошибке вместо черного/белого экрана
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Логируем ошибку в консоль для отладки
    console.error('[ErrorBoundary] Caught an error:', error, errorInfo);
    
    // Вызываем callback, если он предоставлен
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Обновляем состояние с информацией об ошибке
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Если предоставлен кастомный fallback, используем его
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Иначе показываем стандартный UI ошибки
      const errorMessage = this.state.error?.message || 'Произошла неизвестная ошибка';
      const errorStack = this.state.error?.stack;
      const isDev = import.meta.env.DEV;

      return (
        <div className="min-h-screen w-full bg-gradient-to-br from-black via-black to-indigo-950/20 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
            <div className="text-center space-y-6">
              {/* Иконка ошибки */}
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full animate-pulse"></div>
                <div className="relative w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center">
                  <AlertCircle size={40} className="text-red-400" />
                </div>
              </div>

              {/* Заголовок */}
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-white">Что-то пошло не так</h1>
                <p className="text-white/60">
                  Произошла ошибка при загрузке приложения. Мы уже работаем над исправлением.
                </p>
              </div>

              {/* Детали ошибки (только в dev режиме) */}
              {isDev && this.state.error && (
                <div className="mt-6 p-4 bg-red-950/30 border border-red-500/20 rounded-lg text-left">
                  <p className="text-sm font-semibold text-red-400 mb-2">Детали ошибки:</p>
                  <p className="text-xs text-red-300 font-mono break-all mb-2">{errorMessage}</p>
                  {errorStack && (
                    <details className="mt-2">
                      <summary className="text-xs text-red-400 cursor-pointer hover:text-red-300">
                        Показать стек вызовов
                      </summary>
                      <pre className="text-xs text-red-300/80 mt-2 overflow-auto max-h-40 font-mono whitespace-pre-wrap">
                        {errorStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Кнопки действий */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <button
                  onClick={this.handleReset}
                  className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <RefreshCw size={18} />
                  Попробовать снова
                </button>
                <button
                  onClick={this.handleReload}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors flex items-center justify-center gap-2 font-medium border border-white/20"
                >
                  <RefreshCw size={18} />
                  Перезагрузить страницу
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors flex items-center justify-center gap-2 font-medium border border-white/20"
                >
                  <Home size={18} />
                  На главную
                </button>
              </div>

              {/* Дополнительная информация */}
              <div className="pt-4 border-t border-white/10">
                <p className="text-xs text-white/40">
                  Если проблема повторяется, пожалуйста, свяжитесь с поддержкой.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

