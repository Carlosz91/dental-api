import { create } from 'zustand';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastState {
  toasts: ToastItem[];
  push: (kind: ToastKind, message: string, durationMs?: number) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (kind, message, durationMs = 5000) => {
    const id = nextId++;
    set((state) => ({ toasts: [...state.toasts.slice(-3), { id, kind, message }] }));
    if (durationMs > 0) {
      setTimeout(() => get().dismiss(id), durationMs);
    }
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),
}));

/** Imperative API usable outside React components (e.g. API interceptors) */
export const toast = {
  success: (message: string) => useToastStore.getState().push('success', message),
  error: (message: string) => useToastStore.getState().push('error', message, 7000),
  info: (message: string) => useToastStore.getState().push('info', message),
  warning: (message: string) => useToastStore.getState().push('warning', message, 7000),
};
