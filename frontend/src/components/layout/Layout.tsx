import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from '../layout/Header';
import { Footer } from '../layout/Footer';
import { useAuth } from '../../hooks/useAuth';
import { useInactivityTimeout } from '../../hooks/useInactivityTimeout';

/**
 * Root layout component that wires together:
 * - Session restore on boot (httpOnly refresh cookie -> in-memory token)
 * - Auto-logout after 2 minutes of inactivity
 * - Responsive header with navigation
 * - Page outlet for routing
 * - Footer with contact info and social links
 */
export const Layout: React.FC = () => {
  const { isLoading, restoreSession, logout } = useAuth();

  // Restore session once on boot (StrictMode-safe: singleton promise inside the store)
  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  // SECURITY POLICY: end the session after 2 minutes without interaction
  useInactivityTimeout(() => {
    if (useAuth.getState().user) {
      void logout();
    }
  }, 2 * 60 * 1000);

  // While restoring we can't know yet — show a neutral splash instead of flashing guest UI
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dental-50">
        <p className="text-dental-500">Restaurando tu sesión...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dental-50">
      <header>
        <Header />
      </header>

      <main className="pt-16">
        <Outlet />
      </main>

      <footer>
        <Footer />
      </footer>
    </div>
  );
};

Layout.displayName = 'Layout';