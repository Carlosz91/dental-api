import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Button } from './Button';

/**
 * Modal confirmation built on the native <dialog>: focus is trapped, Escape
 * closes it and the page behind becomes inert without extra libraries.
 */
export const ConfirmDialog = ({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Volver',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!loading) onCancel();
      }}
      onClick={(event) => {
        // A click on the backdrop targets the dialog element itself
        if (event.target === ref.current && !loading) onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-900/60"
    >
      <div className="p-6">
        <h2 id="confirm-dialog-title" className="text-xl font-bold text-slate-900">{title}</h2>
        {children && <div className="mt-3 text-sm text-slate-600">{children}</div>}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onCancel} disabled={loading} autoFocus>{cancelLabel}</Button>
          <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm} disabled={loading}>
            {loading ? 'Procesando...' : confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
};
