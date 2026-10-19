import React from 'react';

/**
 * Loading primitives.
 * - Spinner: for short inline waits (buttons, small areas)
 * - Skeleton / CardList: neutral placeholders that mirror the layout being loaded
 * Both respect prefers-reduced-motion (see index.css).
 */
export const Loading = {
  Spinner: ({
    className,
    size = 'medium',
    label = 'Cargando',
  }: {
    className?: string;
    size?: 'small' | 'medium' | 'large';
    label?: string;
  }) => {
    const sizeStyles = { small: 'h-4 w-4', medium: 'h-5 w-5', large: 'h-6 w-6' };
    return (
      <div
        role="status"
        aria-label={label}
        className={`relative animate-spin rounded-full border-2 border-dental-200 border-t-dental-800 ${sizeStyles[size] || sizeStyles.medium} ${className || ''}`}
      />
    );
  },

  /** Decorative placeholder block; wrap in a role="status" container */
  Skeleton: ({ className = '' }: { className?: string }) => (
    <div aria-hidden="true" className={`animate-pulse rounded-xl bg-slate-200/80 ${className}`} />
  ),

  /** Card-shaped skeleton list (specialists, appointments, agenda rows) */
  CardList: ({ count = 3, className = '' }: { count?: number; className?: string }) => (
    <div role="status" aria-live="polite" className={`grid gap-4 ${className}`}>
      <span className="sr-only">Cargando...</span>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} aria-hidden="true" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-11 w-11 shrink-0 animate-pulse rounded-xl bg-slate-200/80" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200/80" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200/80" />
            </div>
          </div>
        </div>
      ))}
    </div>
  ),

  Overlay: ({ className = '', children }: { className?: string; children: React.ReactNode }) => (
    <div className={`fixed inset-0 z-40 bg-dental-50/50 backdrop-blur-sm ${className}`}>
      <div className="relative flex h-full items-center justify-center">{children}</div>
    </div>
  ),
};
