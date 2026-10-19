import React, { useId } from 'react';

/**
 * Dental-styled input component.
 *
 * Accessible: label association (auto id), aria-invalid + aria-describedby for
 * error/hint messages, visible focus ring, 44px minimum height, 16px text
 * (prevents iOS zoom on focus).
 */
type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  hint?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ id, type = 'text', label, error, hint, iconLeft, iconRight, className, 'aria-describedby': describedByProp, ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;
    const describedBy = [describedByProp, error ? errorId : null, hint && !error ? hintId : null].filter(Boolean).join(' ') || undefined;

    const borderClasses = error
      ? 'border-red-700 focus:border-red-700 focus-visible:ring-red-700/30'
      : 'border-slate-500 hover:border-dental-900 focus:border-dental-900 focus-visible:ring-dental-800/30';

    return (
      <div>
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-slate-700">
            {label}
            {props.required && <span aria-hidden="true" className="ml-0.5 text-red-700">*</span>}
          </label>
        )}

        <div className="relative">
          {iconLeft && (
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" aria-hidden="true">
              {iconLeft}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            type={type}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={`min-h-[44px] w-full rounded-xl border bg-white px-4 py-2.5 text-base text-slate-900 transition-colors duration-200 placeholder:text-slate-500 focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100 ${iconLeft ? 'pl-11' : ''} ${iconRight ? 'pr-11' : ''} ${borderClasses} ${className ?? ''}`}
            {...props}
          />

          {iconRight && (
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500">{iconRight}</span>
          )}
        </div>

        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-sm text-slate-600">{hint}</p>
        )}
        {error && (
          <p id={errorId} className="mt-1.5 text-sm font-medium text-red-700" role="alert">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
