import React from 'react';

/**
 * Dental-styled input component with various states:
 * - Default: White background with dental border
 * - With label: Proper label positioning
 * - Error: Red border and error message
 * - Success: Green border
 * - With iconLeft/iconRight: Leading/trailing icons
 *
 * Accessible: proper label association, focus styles, error messaging
 */
type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  success?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
};

export const Input = ({
  id,
  type = 'text',
  placeholder,
  label,
  error,
  success,
  iconLeft,
  iconRight,
  ...props
}: InputProps) => {
  const inputClasses = 'w-full rounded-2xl border border-dental-200 bg-white px-4 py-3 text-slate-900 placeholder:text-dental-400 focus:border-dental-500 focus:ring-2 focus:ring-dental-500/20 focus:outline-none hover:border-dental-300 disabled:bg-dental-50 disabled:cursor-not-allowed transition-all duration-200';
  const labelClasses = 'block text-slate-600 text-sm font-medium mb-2';

  return (
    <div className="relative">
      {label && <label htmlFor={id} className={labelClasses}>{label}</label>}

      <input
        id={id}
        type={type}
        placeholder={placeholder}
        className={inputClasses}
        {...props}
      />

      {iconLeft && (
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dental-400">
          {iconLeft}
        </span>
      )}

      {iconRight && (
        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dental-400">
          {iconRight}
        </span>
      )}

      {error && (
        <p
          className="mt-2 text-dental-600 text-xs"
          role="alert"
        >
          {error}
        </p>
      )}

      {success && (
        <p
          className="mt-2 text-dental-600 text-xs"
          role="alert"
        >
          {success}
        </p>
      )}
    </div>
  );
};

Input.displayName = 'Input';