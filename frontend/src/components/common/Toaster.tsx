import { CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react';
import { useToastStore } from '../../lib/toast';
import type { ToastKind } from '../../lib/toast';

const kindStyles: Record<ToastKind, { box: string; icon: typeof Info }> = {
  success: { box: 'border-emerald-300 bg-emerald-50 text-emerald-900', icon: CheckCircle2 },
  error: { box: 'border-red-300 bg-red-100 text-red-800', icon: XCircle },
  warning: { box: 'border-amber-300 bg-amber-50 text-amber-900', icon: TriangleAlert },
  info: { box: 'border-dental-300 bg-white text-slate-800', icon: Info },
};

/**
 * Lightweight toast region (no external dependency).
 * Polite live region so screen readers announce messages without interrupting.
 */
export const Toaster = () => {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    <div
      role="region"
      aria-label="Notificaciones"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-4 sm:items-end sm:px-6"
    >
      {toasts.map((item) => {
        const { box, icon: Icon } = kindStyles[item.kind];
        return (
          <div
            key={item.id}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg animate-fade-in-up ${box}`}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <p className="min-w-0 flex-1">{item.message}</p>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dental-800"
              aria-label="Cerrar notificación"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

Toaster.displayName = 'Toaster';
