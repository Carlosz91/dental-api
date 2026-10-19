import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { AlertCircle } from 'lucide-react';
import { Button } from './Button';

/** Friendly empty state: icon, short explanation and an optional next action */
export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) => (
  <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
    <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-dental-50 text-dental-900">
      <Icon className="h-7 w-7" aria-hidden="true" />
    </span>
    <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
    {description && <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-600">{description}</p>}
    {action && <div className="mt-6 flex justify-center">{action}</div>}
  </div>
);

/** Error state with a retry action */
export const ErrorState = ({
  title = 'Algo salió mal',
  description = 'No pudimos cargar la información. Revisa tu conexión e inténtalo de nuevo.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) => (
  <div role="alert" className="rounded-2xl border border-red-300 bg-red-100/60 px-6 py-8 text-center">
    <AlertCircle className="mx-auto h-8 w-8 text-red-700" aria-hidden="true" />
    <h3 className="mt-3 font-semibold text-red-800">{title}</h3>
    <p className="mx-auto mt-1.5 max-w-md text-sm text-red-800">{description}</p>
    {onRetry && (
      <div className="mt-5 flex justify-center">
        <Button variant="outline" onClick={onRetry}>Reintentar</Button>
      </div>
    )}
  </div>
);
