import React from 'react';

/**
 * Dental-styled loading spinners and states
 *
 * Spinner variants:
 * - default: Standard spinner with dental blue
 * - small: Smaller spinner for inline use
 * - inline: Inline with text
 *
 * Loading overlay for forms and pages
 */
export const Loading = {
  /**
   * Standard spinner component
   */
  Spinner: ({
    className,
    size = 'medium',
    ...props
  }: {
    className?: string;
    size?: 'small' | 'medium' | 'large';
    [key: string]: any;
  }) => {
    const sizeStyles = {
      small: 'w-4 h-4',
      medium: 'w-5 h-5',
      large: 'w-6 h-6',
    };

    return (
      <div
        role="status"
        aria-label="Cargando"
        className={`relative animate-spin rounded-full border-2 border-dental-200 border-t-dental-500 ${sizeStyles[size] || sizeStyles.medium} ${className || ''}`}
        {...props}
      />
    );
  },

  /**
   * Loading overlay for forms and pages
   */
  Overlay: ({
    className,
    children,
    ...props
  }: {
    className?: string;
    children: React.ReactNode;
    [key: string]: any;
  }) => {
    return (
      <div
        className={`fixed inset-0 bg-dental-50/50 backdrop-blur-sm z-40 ${className}`}
        {...props}
      >
        <div className="relative flex items-center justify-center h-full">
          {children}
        </div>
      </div>
    );
  },
};
