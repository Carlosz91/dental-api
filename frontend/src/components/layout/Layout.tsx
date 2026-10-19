import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Header } from '../layout/Header';
import { Footer } from '../layout/Footer';
import { Toaster } from '../common/Toaster';
import { Button } from '../common/Button';
import { Loading } from '../common/Loading';
import { useAuth } from '../../hooks/useAuth';
import { useInactivityTimeout } from '../../hooks/useInactivityTimeout';
import { onSessionExpired } from '../../lib/api';
import { toast } from '../../lib/toast';

/**
 * Root layout component that wires together:
 * - Session restore on boot (httpOnly refresh cookie -> in-memory token)
 * - Session-expired handling (failed silent refresh -> clear user + toast;
 *   protected routes then redirect to the matching login)
 * - Auto-logout after INACTIVITY_TIMEOUT_MS with a countdown warning
 * - Skip link, header, main landmark, footer and toast region
 */
export const Layout: React.FC = () => {
  const { user, isLoading, restoreSession, logout } = useAuth();
  const queryClient = useQueryClient();

  // Restore session once on boot (StrictMode-safe: singleton promise inside the store)
  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  // A failed refresh means the session is gone: forget the user and tell them why
  useEffect(() => {
    return onSessionExpired(() => {
      if (!useAuth.getState().user) return;
      useAuth.getState().expireSession();
      queryClient.clear();
      toast.warning('Tu sesión expiró. Inicia sesión de nuevo para continuar.');
    });
  }, [queryClient]);

  // SECURITY POLICY: end the session after a period without interaction
  const { secondsLeft, stayActive } = useInactivityTimeout({
    enabled: !!user,
    onTimeout: () => {
      if (useAuth.getState().user) {
        void logout();
        queryClient.clear();
        toast.info('Cerramos tu sesión por inactividad.');
      }
    },
  });

  // While restoring we can't know yet — show a neutral splash instead of flashing guest UI
  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-dental-50 text-slate-600">
        <Loading.Spinner size="large" label="Restaurando tu sesión" />
        <p>Restaurando tu sesión...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-dental-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:font-semibold focus:text-dental-900 focus:shadow-lg"
      >
        Saltar al contenido
      </a>

      <Header />

      {secondsLeft !== null && (
        <div role="alert" className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-medium">
              <span className="sr-only">Tu sesión se cerrará pronto por inactividad.</span>
              <span aria-hidden="true">
                Tu sesión se cerrará por inactividad en {secondsLeft} {secondsLeft === 1 ? 'segundo' : 'segundos'}.
              </span>
            </p>
            <Button variant="outline" size="sm" onClick={stayActive}>Seguir conectado</Button>
          </div>
        </div>
      )}

      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <Outlet />
      </main>

      <Footer />
      <Toaster />
    </div>
  );
};

Layout.displayName = 'Layout';
