import React, { useState } from 'react';
import { User, Mail, Lock, ArrowRight, Sparkles, AlertCircle, UserCircle2, ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react';

interface AuthPageProps {
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister: (username: string, password: string) => Promise<void>;
  onGuestLogin: () => Promise<void>;
  onResetPassword: (username: string, newPass: string) => Promise<void>;
  error: string | null;
}

type AuthMode = 'signin' | 'signup' | 'forgot';

export const AuthPage: React.FC<AuthPageProps> = ({ onLogin, onRegister, onGuestLogin, onResetPassword, error }) => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  
  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate network delay for realism
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      if (mode === 'forgot') {
        await onResetPassword(username, newPassword);
        setResetSuccess(true);
      } else if (mode === 'signin') {
        await onLogin(username, password);
      } else {
        await onRegister(username, password);
      }
    } catch (err) {
      // Error handled by parent via props
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setResetSuccess(false);
    setNewPassword('');
  };

  const getTitle = () => {
    if (mode === 'forgot') return 'Reset Password';
    return mode === 'signin' ? 'Welcome Back' : 'Create Account';
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden">
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo Area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-[0_0_40px_rgba(99,102,241,0.5)] mb-4 animate-float">
            <Sparkles className="text-white w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Bugrov Space</h1>
          <p className="text-white/50 text-sm font-medium uppercase tracking-widest">Next Gen AI Workspace</p>
        </div>

        {/* Card */}
        <div className="bg-black/40 backdrop-blur-3xl border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden relative group">
          
          {/* Top Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-50 blur-sm"></div>

          <div className="p-8">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              {mode === 'forgot' ? (
                 <button 
                   onClick={() => switchMode('signin')}
                   className="text-white/50 hover:text-white flex items-center gap-1 text-sm font-medium transition-colors"
                 >
                   <ArrowLeft size={14} /> Back
                 </button>
              ) : (
                <h2 className="text-2xl font-bold text-white">
                  {getTitle()}
                </h2>
              )}
              
              <div className="text-[10px] font-bold text-white/30 border border-white/10 px-2 py-1 rounded-full uppercase">
                {mode === 'forgot' ? 'Recovery' : 'Secured'}
              </div>
            </div>

            {/* Error Message */}
            {error && !resetSuccess && (
              <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm animate-in slide-in-from-top-2">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {/* Success Message (Recovery) */}
            {resetSuccess ? (
              <div className="text-center py-8 animate-in fade-in zoom-in duration-300">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20 text-emerald-400">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">Password Updated</h3>
                <p className="text-white/50 text-sm mb-6">
                  Your password has been successfully changed for <span className="text-white">{username}</span>
                </p>
                <button
                  onClick={() => switchMode('signin')}
                  className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  Login Now
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                
                <div className="space-y-1.5 group/input">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-wider ml-1">Username</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within/input:text-indigo-400 transition-colors">
                      <User size={18} />
                    </div>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-black/20 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all"
                      placeholder="johndoe"
                    />
                  </div>
                </div>

                {mode !== 'forgot' && (
                  <div className="space-y-1.5 group/input">
                    <div className="flex justify-between items-center ml-1">
                       <label className="text-xs font-bold text-white/40 uppercase tracking-wider">Password</label>
                       {mode === 'signin' && (
                         <button 
                           type="button" 
                           onClick={() => switchMode('forgot')}
                           className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-wide transition-colors"
                         >
                           Forgot Password?
                         </button>
                       )}
                    </div>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within/input:text-indigo-400 transition-colors">
                        <Lock size={18} />
                      </div>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                )}

                {/* New Password Field for Recovery Mode */}
                {mode === 'forgot' && (
                  <div className="space-y-1.5 group/input animate-in slide-in-from-bottom-2">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-wider ml-1">New Password</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within/input:text-indigo-400 transition-colors">
                        <KeyRound size={18} />
                      </div>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-transparent transition-all"
                        placeholder="Enter new password"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-6 py-4 bg-white text-black rounded-xl font-bold text-sm hover:bg-indigo-50 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="animate-pulse">Processing...</span>
                  ) : (
                    <>
                      {mode === 'forgot' ? (
                        <>Update Password <KeyRound size={16} /></>
                      ) : (
                        <>
                           {mode === 'signin' ? 'Sign In' : 'Create Account'} <ArrowRight size={16} />
                        </>
                      )}
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Guest Login Button */}
            {!resetSuccess && mode === 'signin' && (
              <button
                type="button"
                onClick={onGuestLogin}
                className="w-full mt-3 py-2 flex items-center justify-center gap-2 text-xs font-bold text-white/40 hover:text-white transition-colors uppercase tracking-widest group"
              >
                <UserCircle2 size={14} className="group-hover:text-indigo-400 transition-colors" />
                Гостевой вход
              </button>
            )}

          </div>

          {/* Footer Toggle */}
          {!resetSuccess && (
            <div className="p-6 bg-black/20 border-t border-white/5 text-center">
              {mode === 'forgot' ? (
                 <p className="text-sm text-white/50">
                   Remember your password?
                   <button
                     onClick={() => switchMode('signin')}
                     className="ml-2 font-bold text-white hover:underline"
                   >
                     Sign In
                   </button>
                 </p>
              ) : (
                <p className="text-sm text-white/50">
                  {mode === 'signin' ? "Don't have an account?" : "Already have an account?"}
                  <button
                    onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
                    className="ml-2 font-bold text-white hover:underline"
                  >
                    {mode === 'signin' ? 'Sign Up' : 'Sign In'}
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