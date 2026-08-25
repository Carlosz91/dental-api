import React from 'react';

/**
 * Dental-styled card component with multiple variants:
 * - default: White card with subtle border
 * - elevated: Elevated shadow with border
 * - outlined: Outline style with custom border
 * - glass: Glassmorphism effect with backdrop blur
 *
 * All cards have consistent rounding and transition effects
 */
type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'default' | 'elevated' | 'outlined' | 'glass';
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    const baseClasses = 'bg-white rounded-2xl border border-slate-200/80 shadow-sm transition-all duration-200 ease-out';

    let cardClasses = '';

    switch (variant) {
      case 'default':
        cardClasses = baseClasses;
        break;
      case 'elevated':
        cardClasses = `${baseClasses} shadow-lg border-dental-200`;
        break;
      case 'outlined':
        cardClasses = `${baseClasses} hover:shadow-lg hover:border-dental-300 hover:-translate-y-0.5`;
        break;
      case 'glass':
        cardClasses = 'bg-white/90 backdrop-blur-lg border-slate-200/80 rounded-2xl';
        break;
    }

    return (
      <div
        className={`
          ${cardClasses}
          animate-fade-in-up
          ${className || ''}
        `}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';