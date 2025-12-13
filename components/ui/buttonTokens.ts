export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export const buttonTokens = {
  radii: {
    md: 'rounded-lg',
    lg: 'rounded-xl',
    pill: 'rounded-full',
  },
  focusRing: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black',
  base: 'inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed',
  sizes: {
    sm: { height: 'h-9', padding: 'px-3', text: 'text-sm', gap: 'gap-2' },
    md: { height: 'h-11', padding: 'px-4', text: 'text-sm', gap: 'gap-2.5' },
    lg: { height: 'h-12', padding: 'px-5', text: 'text-base', gap: 'gap-3' },
  } as Record<ButtonSize, { height: string; padding: string; text: string; gap: string }>,
  variants: {
    primary: 'bg-indigo-500 text-white hover:bg-indigo-400 active:bg-indigo-500/90 shadow-[0_10px_30px_-12px_rgba(99,102,241,0.45)]',
    secondary: 'bg-white text-black hover:bg-slate-100 active:bg-slate-200 shadow-[0_10px_30px_-12px_rgba(255,255,255,0.35)]',
    tertiary: 'bg-white/10 text-white hover:bg-white/15 active:bg-white/20 border border-white/15',
    ghost: 'bg-transparent text-white hover:bg-white/10 active:bg-white/15 border border-transparent',
  } as Record<ButtonVariant, string>,
};


