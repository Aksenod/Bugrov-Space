import React from 'react';
type IconCircleButtonVariant = 'primary' | 'subtle' | 'danger' | 'ghost';
type IconCircleButtonSize = 'lg' | 'sm';

interface IconCircleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconCircleButtonVariant;
  size?: IconCircleButtonSize;
}

/**
 * Унифицированная круглая кнопка для иконок.
 * Размеры: lg (44px), sm (36px).
 * Варианты: primary, subtle, danger, ghost.
 */
export const IconCircleButton: React.FC<IconCircleButtonProps> = ({
  variant = 'subtle',
  size = 'lg',
  disabled,
  className,
  children,
  ...rest
}) => {
  const sizeClass = size === 'sm' ? 'w-9 h-9' : 'w-11 h-11';

  const variantClass = (() => {
    if (disabled) {
      return 'bg-white/5 border border-white/10 text-white/30 cursor-not-allowed';
    }

    switch (variant) {
      case 'primary':
        return 'bg-white text-black border border-white shadow-[0_0_15px_rgba(255,255,255,0.25)] hover:bg-indigo-50 hover:shadow-[0_0_20px_rgba(255,255,255,0.35)]';
      case 'danger':
        return 'bg-red-500/20 border border-red-500/40 text-red-200 shadow-[0_0_12px_rgba(239,68,68,0.25)] hover:bg-red-500/30 hover:text-red-100 hover:shadow-[0_0_18px_rgba(239,68,68,0.35)]';
      case 'ghost':
        return 'bg-transparent border border-white/10 text-white/60 hover:bg-white/5 hover:text-white';
      case 'subtle':
      default:
        return 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white';
    }
  })();

  return (
    <button
      type="button"
      disabled={disabled}
      className={[
        'inline-flex items-center justify-center rounded-full transition-all duration-200 active:translate-y-px focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-white/30 backdrop-blur-sm',
        sizeClass,
        variantClass,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
};

