import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { buttonTokens, ButtonSize, ButtonVariant } from './buttonTokens';

const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  isLoading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    fullWidth,
    leadingIcon,
    trailingIcon,
    isLoading,
    className,
    disabled,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  const sizeStyles = buttonTokens.sizes[size];
  const variantStyles = buttonTokens.variants[variant];

  const content = (
    <>
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        leadingIcon
      )}
      <span className="truncate">{children}</span>
      {trailingIcon}
    </>
  );

  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        buttonTokens.base,
        buttonTokens.radii.lg,
        buttonTokens.focusRing,
        sizeStyles.height,
        sizeStyles.padding,
        sizeStyles.text,
        sizeStyles.gap,
        variantStyles,
        fullWidth && 'w-full',
        isLoading && 'cursor-progress',
        className,
      )}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...rest}
    >
      {content}
    </button>
  );
});


