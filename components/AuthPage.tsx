import React, { useState, useEffect } from 'react';
import { User, Lock, ArrowRight, Sparkles, AlertCircle, ArrowLeft, CheckCircle2, KeyRound, Eye, EyeOff, Check, X } from 'lucide-react';

interface AuthPageProps {
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister: (username: string, password: string) => Promise<void>;
  onResetPassword: (username: string, newPass: string) => Promise<void>;
  error: string | null;
  onClearError?: () => void;
}

const formatError = (error: string | null): string => {
  if (!error) return '';
  return error;
};

type AuthMode = 'signin' | 'signup' | 'forgot';

// Password strength calculator
const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
  if (!password) return { strength: 0, label: '', color: '' };
  
  let strength = 0;
  if (password.length >= 6) strength++;
  if (password.length >= 8) strength++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[^a-zA-Z\d]/.test(password)) strength++;
  
  const levels: Array<{ strength: number; label: string; color: string }> = [
    { strength: 1, label: 'Очень слабый', color: 'bg-red-500' },
    { strength: 2, label: 'Слабый', color: 'bg-orange-500' },
    { strength: 3, label: 'Средний', color: 'bg-yellow-500' },
    { strength: 4, label: 'Хороший', color: 'bg-blue-500' },
    { strength: 5, label: 'Отличный', color: 'bg-emerald-500' },
  ];
  
  const index = Math.min(strength - 1, 4);
  return levels[index] || { strength: 0, label: '', color: '' };
};

// Username validation
const validateUsername = (username: string): { valid: boolean; message: string } => {
  if (!username) return { valid: false, message: '' };
  if (username.length < 3) return { valid: false, message: 'Минимум 3 символа' };
  if (username.length > 20) return { valid: false, message: 'Максимум 20 символов' };
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return { valid: false, message: 'Только буквы, цифры и _' };
  return { valid: true, message: '' };
};

export const AuthPage: React.FC<AuthPageProps> = ({ onLogin, onRegister, onResetPassword, error, onClearError }) => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // Validation State
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [touched, setTouched] = useState({ username: false, password: false, newPassword: false });

  // Real-time validation
  useEffect(() => {
    if (touched.username) {
      const validation = validateUsername(username);
      setUsernameError(validation.valid ? '' : validation.message);
    }
  }, [username, touched.username]);

  useEffect(() => {
    if (touched.password && password) {
      if (password.length < 6) {
        setPasswordError('Минимум 6 символов');
      } else {
        setPasswordError('');
      }
    }
  }, [password, touched.password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (import.meta.env.DEV) {
      console.log('[AuthPage] Form submitted', { mode, username, passwordLength: password.length });
    }
    
    // Помечаем все поля как touched при попытке отправки
    const newTouched = { username: true, password: true, newPassword: true };
    setTouched(newTouched);
    
    // Validation before submit
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      setUsernameError(usernameValidation.message);
      if (import.meta.env.DEV) {
        console.log('[AuthPage] Username validation failed:', usernameValidation.message);
      }
      return;
    }
    setUsernameError('');
    
    if (mode !== 'forgot' && password.length < 6) {
      setPasswordError('Минимум 6 символов');
      if (import.meta.env.DEV) {
        console.log('[AuthPage] Password validation failed: minimum 6 characters');
      }
      return;
    }
    
    if (mode === 'forgot' && newPassword.length < 6) {
      if (import.meta.env.DEV) {
        console.log('[AuthPage] New password validation failed: minimum 6 characters');
      }
      return;
    }
    
    // Очищаем ошибки перед отправкой
    setPasswordError('');
    setUsernameError('');
    
    setIsLoading(true);
    
    if (import.meta.env.DEV) {
      console.log('[AuthPage] Starting authentication...');
    }

    try {
      if (mode === 'forgot') {
        await onResetPassword(username, newPassword);
        setResetSuccess(true);
      } else if (mode === 'signin') {
        await onLogin(username, password);
        if (import.meta.env.DEV) {
          console.log('[AuthPage] Login successful');
        }
      } else {
        await onRegister(username, password);
        if (import.meta.env.DEV) {
          console.log('[AuthPage] Registration successful');
        }
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error('[AuthPage] Authentication error:', err);
      }
      // Error handled by parent via props
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setResetSuccess(false);
    setNewPassword('');
    setPassword('');
    setUsernameError('');
    setPasswordError('');
    setTouched({ username: false, password: false, newPassword: false });
    // Очищаем ошибки авторизации при переключении режимов
    if (onClearError) {
      onClearError();
    }
  };

  const getTitle = () => {
    if (mode === 'forgot') return 'Сброс пароля';
    return mode === 'signin' ? 'Добро пожаловать' : 'Создать аккаунт';
  };

  const passwordStrength = mode === 'signup' || mode === 'forgot' ? getPasswordStrength(mode === 'forgot' ? newPassword : password) : null;

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo Area */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-[0_0_40px_rgba(99,102,241,0.5)] mb-4 animate-float">
            <Sparkles className="text-white w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Bugrov Space</h1>
          <p className="text-white/50 text-sm font-medium uppercase tracking-widest">AI teams for designers</p>
        </div>

        {/* Card */}
        <div className="bg-gradient-to-br from-black/50 via-black/40 to-indigo-950/20 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-2xl shadow-indigo-500/10 overflow-hidden relative group animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Top Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50 blur-sm"></div>

          <div className="p-8">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              {mode === 'forgot' ? (
                 <button 
                   onClick={() => switchMode('signin')}
                   className="text-white/50 hover:text-white flex items-center gap-1 text-sm font-medium transition-colors group/back"
                 >
                   <ArrowLeft size={14} className="group-hover/back:-translate-x-1 transition-transform" /> Назад
                 </button>
              ) : (
                <h2 className="text-2xl font-bold text-white">
                  {getTitle()}
                </h2>
              )}
              
              <div className="text-[10px] font-bold text-white/30 border border-white/10 px-2 py-1 rounded-full uppercase">
                {mode === 'forgot' ? 'Восстановление' : 'Защищено'}
              </div>
            </div>

            {/* Error Message */}
            {error && !resetSuccess && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm animate-in slide-in-from-top-2">
                <AlertCircle size={16} />
                <span>{formatError(error)}</span>
              </div>
            )}

            {/* Success Message (Recovery) */}
            {resetSuccess ? (
              <div className="text-center py-8 animate-in fade-in zoom-in duration-300">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20 text-emerald-400">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">Пароль обновлен</h3>
                <p className="text-white/50 text-sm mb-6">
                  Пароль успешно изменен для <span className="text-white font-semibold">{username}</span>
                </p>
                <button
                  onClick={() => switchMode('signin')}
                  className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  Войти сейчас
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                
                {/* Username Field */}
                <div className="space-y-1.5 group/input">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-wider ml-1 flex items-center justify-between">
                    <span>Имя пользователя</span>
                    {touched.username && usernameError && (
                      <span className="text-red-400 text-[10px] normal-case font-normal">{usernameError}</span>
                    )}
                  </label>
                  <div className="relative">
                    <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
                      touched.username && usernameError ? 'text-red-400' : 
                      touched.username && !usernameError && username ? 'text-emerald-400' :
                      'text-white/30 group-focus-within/input:text-indigo-400'
                    }`}>
                      <User size={18} />
                    </div>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setTouched({ ...touched, username: true });
                      }}
                      onBlur={() => setTouched({ ...touched, username: true })}
                      className={`w-full bg-black/20 border rounded-xl py-3.5 pl-11 pr-10 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black transition-all ${
                        touched.username && usernameError 
                          ? 'border-red-500/50 focus:ring-red-500/70' 
                          : touched.username && !usernameError && username
                          ? 'border-emerald-500/50 focus:ring-emerald-500/70'
                          : 'border-white/10 focus:ring-indigo-500/70 focus:border-indigo-500/50'
                      }`}
                      placeholder="johndoe"
                    />
                    {touched.username && !usernameError && username && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400">
                        <Check size={18} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Password Field */}
                {mode !== 'forgot' && (
                  <div className="space-y-1.5 group/input">
                    <div className="flex justify-between items-center ml-1">
                       <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Пароль</label>
                       {mode === 'signin' && (
                         <button 
                           type="button" 
                           onClick={() => switchMode('forgot')}
                           className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-wide transition-colors"
                         >
                           Забыли пароль?
                         </button>
                       )}
                    </div>
                    <div className="relative">
                      <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
                        touched.password && passwordError ? 'text-red-400' : 
                        touched.password && !passwordError && password ? 'text-emerald-400' :
                        'text-white/30 group-focus-within/input:text-indigo-400'
                      }`}>
                        <Lock size={18} />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setTouched({ ...touched, password: true });
                        }}
                        onBlur={() => setTouched({ ...touched, password: true })}
                        className={`w-full bg-black/20 border rounded-xl py-3.5 pl-11 pr-11 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black transition-all ${
                          touched.password && passwordError 
                            ? 'border-red-500/50 focus:ring-red-500/70' 
                            : touched.password && !passwordError && password
                            ? 'border-emerald-500/50 focus:ring-emerald-500/70'
                            : 'border-white/10 focus:ring-indigo-500/70 focus:border-indigo-500/50'
                        }`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {touched.password && passwordError && (
                      <p className="text-red-400 text-xs ml-1">{passwordError}</p>
                    )}
                    
                    {/* Password Strength Indicator (only for signup) */}
                    {mode === 'signup' && password && (
                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/40">Надежность пароля:</span>
                          <span className={`font-medium ${passwordStrength?.color.replace('bg-', 'text-')}`}>
                            {passwordStrength?.label}
                          </span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${passwordStrength?.color || 'bg-gray-500'}`}
                            style={{ width: `${(passwordStrength?.strength || 0) * 20}%` }}
                          ></div>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-[10px] text-white/30 mt-2">
                          <div className={`flex items-center gap-1.5 ${password.length >= 6 ? 'text-emerald-400' : ''}`}>
                            {password.length >= 6 ? <Check size={12} /> : <X size={12} />}
                            <span>Минимум 6 символов</span>
                          </div>
                          <div className={`flex items-center gap-1.5 ${password.length >= 8 ? 'text-emerald-400' : ''}`}>
                            {password.length >= 8 ? <Check size={12} /> : <X size={12} />}
                            <span>Рекомендуется 8+</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* New Password Field for Recovery Mode */}
                {mode === 'forgot' && (
                  <div className="space-y-1.5 group/input animate-in slide-in-from-bottom-2">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-wider ml-1">Новый пароль</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within/input:text-indigo-400 transition-colors">
                        <KeyRound size={18} />
                      </div>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setTouched({ ...touched, newPassword: true });
                        }}
                        onBlur={() => setTouched({ ...touched, newPassword: true })}
                        className="w-full bg-black/20 border border-white/10 rounded-xl py-3.5 pl-11 pr-11 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/70 focus:ring-offset-2 focus:ring-offset-black focus:border-indigo-500/50 transition-all"
                        placeholder="Введите новый пароль"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                      >
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    
                    {/* Password Strength Indicator for recovery */}
                    {newPassword && (
                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/40">Надежность пароля:</span>
                          <span className={`font-medium ${getPasswordStrength(newPassword).color.replace('bg-', 'text-')}`}>
                            {getPasswordStrength(newPassword).label}
                          </span>
                        </div>
                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${getPasswordStrength(newPassword).color || 'bg-gray-500'}`}
                            style={{ width: `${(getPasswordStrength(newPassword).strength || 0) * 20}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || (touched.username && !!usernameError) || (touched.password && !!passwordError)}
                  onClick={(e) => {
                    if (import.meta.env.DEV) {
                      console.log('[AuthPage] Button clicked', {
                        isLoading,
                        usernameError,
                        passwordError,
                        touched,
                        disabled: isLoading || (touched.username && !!usernameError) || (touched.password && !!passwordError)
                      });
                    }
                    // Если кнопка disabled, предотвращаем отправку
                    if (isLoading || (touched.username && !!usernameError) || (touched.password && !!passwordError)) {
                      e.preventDefault();
                      return;
                    }
                  }}
                  className="w-full mt-6 py-4 bg-white text-black rounded-xl font-bold text-sm hover:bg-indigo-50 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                >
                  {isLoading ? (
                    <span className="animate-pulse">Обработка...</span>
                  ) : (
                    <>
                      {mode === 'forgot' ? (
                        <>Обновить пароль <KeyRound size={16} /></>
                      ) : (
                        <>
                           {mode === 'signin' ? 'Войти' : 'Создать аккаунт'} <ArrowRight size={16} />
                        </>
                      )}
                    </>
                  )}
                </button>
              </form>
            )}

          </div>

          {/* Footer Toggle */}
          {!resetSuccess && (
            <div className="p-6 bg-black/20 border-t border-white/5 text-center">
              {mode === 'forgot' ? (
                 <p className="text-sm text-white/50">
                   Помните пароль?
                   <button
                     onClick={() => switchMode('signin')}
                     className="ml-2 font-bold text-white hover:underline transition-colors"
                   >
                     Войти
                   </button>
                 </p>
              ) : (
                <p className="text-sm text-white/50">
                  {mode === 'signin' ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}
                  <button
                    onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
                    className="ml-2 font-bold text-white hover:underline transition-colors"
                  >
                    {mode === 'signin' ? 'Зарегистрироваться' : 'Войти'}
                  </button>
                </p>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};