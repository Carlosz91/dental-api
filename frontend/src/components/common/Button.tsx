import React from 'react';

/**
 * Dental-styled button component with 4 variants:
 * - primary: Blue CTA button
 * - secondary: Light blue button with border
 * - outline: Transparent background with blue border
 * - ghost: Fully transparent with blue text
 *
 * Accessible: focus-visible styles, proper contrast, disabled state
 */
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant = 'primary',
    size = 'md',
    children,
    disabled,
    ...props
  }, ref) => {
    const baseClasses = 'inline-flex !w-fit max-w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold shadow-sm transition-all duration-200 ease-out hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dental-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed';

    const sizeClasses = {
      sm: 'px-2.5 py-1.5 text-xs gap-1.5',
      md: 'px-3 py-2 text-xs sm:px-4 sm:py-2.5 sm:text-sm',
      lg: 'px-4 py-3 text-sm sm:px-6 sm:py-3 sm:text-base',
    };

    let buttonClasses = '';
    switch (variant) {
      case 'primary':
        buttonClasses = `${baseClasses} ${sizeClasses[size]} bg-dental-600 text-white shadow-sm hover:bg-dental-700 hover:-translate-y-0.5 active:bg-dental-800 active:translate-y-0`;
        break;
      case 'secondary':
        buttonClasses = `${baseClasses} ${sizeClasses[size]} bg-dental-50 text-dental-700 border border-dental-200 shadow-sm hover:bg-dental-100 hover:border-dental-300 hover:-translate-y-0.5 active:bg-dental-200 active:translate-y-0`;
        break;
      case 'outline':
        buttonClasses = `${baseClasses} ${sizeClasses[size]} bg-white text-dental-700 border border-dental-300 hover:bg-dental-50 hover:border-dental-500 hover:-translate-y-0.5 active:bg-dental-100 active:translate-y-0`;
        break;
      case 'ghost':
        buttonClasses = `${baseClasses} ${sizeClasses[size]} bg-transparent text-dental-600 hover:bg-dental-100 hover:-translate-y-0.5 active:bg-dental-200 active:translate-y-0`;
        break;
    }

    return (
      <button
        className={`
            ${buttonClasses} shadow-sm
          ${disabled ? 'opacity-50 cursor-not-allowed disabled:shadow-none' : ''}
          ${className || ''}
        `}
        disabled={disabled}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';