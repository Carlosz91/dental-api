import React from 'react';

/**
 * Dental-styled button component with variants:
 * - primary: Solid blue CTA (white text, AA contrast)
 * - secondary: Light blue button with border
 * - outline: White background with blue border
 * - ghost: Transparent with blue text
 * - accent: Bright cyan CTA for use on dark backgrounds
 * - danger: Destructive action (e.g. cancel an appointment)
 *
 * Accessible: visible focus ring, 44px minimum touch target, AA contrast, disabled state.
 */
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'accent' | 'danger';
  size?: 'sm' | 'md' | 'lg';
};

const baseClasses =
  'inline-flex max-w-full cursor-pointer items-center justify-center gap-2 rounded-lg font-semibold shadow-sm transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dental-800 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none';

const sizeClasses = {
  sm: 'min-h-[44px] px-3 py-2 text-sm',
  md: 'min-h-[44px] px-4 py-2.5 text-sm',
  lg: 'min-h-[48px] px-6 py-3 text-base',
};

const variantClasses = {
  primary: 'bg-dental-800 text-white hover:bg-dental-900 active:bg-dental-900',
  secondary: 'border border-dental-300 bg-dental-50 text-dental-900 hover:bg-dental-100 active:bg-dental-200',
  outline: 'border border-dental-800 bg-white text-dental-900 hover:bg-dental-50 active:bg-dental-100',
  ghost: 'bg-transparent text-dental-900 shadow-none hover:bg-dental-100 active:bg-dental-200',
  accent: 'bg-cyan-300 text-slate-950 hover:bg-cyan-200 active:bg-cyan-200 focus-visible:ring-white focus-visible:ring-offset-slate-900',
  danger: 'bg-red-700 text-white hover:bg-red-800 active:bg-red-800 focus-visible:ring-red-700',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', type = 'button', children, ...props }, ref) => {
    return (
      <button
        type={type}
        className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className || ''}`}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
