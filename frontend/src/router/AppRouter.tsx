import type { ReactNode } from 'react';
import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Home } from '../pages/Home';
import { Specialists } from '../pages/Specialists';
import { SpecialistDetail } from '../pages/SpecialistDetail';
import { Booking } from '../pages/Booking';
import { MyAppointments } from '../pages/MyAppointments';
import { Dashboard } from '../pages/Dashboard';
import { StaffLogin } from '../pages/StaffLogin';
import { ClientLogin } from '../pages/ClientLogin';
import { ClientRegister } from '../pages/ClientRegister';
import { NotFound } from '../pages/NotFound';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../hooks/useAuth';
import { STAFF_ROLES, getRedirectFrom, homePathFor, isStaffRole, loginPathFor } from '../lib/auth-routing';

type Role = Exclude<UserRole, null>;

/**
 * Route guard. The Layout shows a splash while the session is being restored,
 * so by the time a guard renders `user` is settled.
 * - Anonymous: sent to the login that matches the route audience (remembering where they were going)
 * - Wrong role: sent to their own home (patients -> /myappointments, staff -> /dashboard)
 * `roles` omitted means any authenticated user.
 */
function RequireRole({ roles, children }: { roles?: ReadonlyArray<Role>; children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to={loginPathFor(roles)} replace state={{ from: location }} />;
  }
  if (roles && !roles.includes(user.role as Role)) {
    return <Navigate to={homePathFor(user.role)} replace />;
  }
  return <>{children}</>;
}

/**
 * Keeps signed-in users away from login/register pages.
 * `audience` limits who is redirected: a staff member opening the client login
 * is left alone so the page can run its own "wrong account" check after submit.
 */
function RedirectIfAuthenticated({ audience, children }: { audience: 'client' | 'staff' | 'any'; children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <>{children}</>;

  const matches =
    audience === 'any' ||
    (audience === 'client' && user.role === 'paciente') ||
    (audience === 'staff' && isStaffRole(user.role));

  if (!matches) return <>{children}</>;

  const target = getRedirectFrom(location.state) ?? (audience === 'any' && user.role === 'paciente' ? '/booking' : homePathFor(user.role));
  return <Navigate to={target} replace />;
}

export const AppRouter = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { path: '', element: <Home /> },
      { path: 'specialists', element: <Specialists /> },
      { path: 'specialist/:id', element: <SpecialistDetail /> },
      {
        path: 'booking',
        element: (
          <RequireRole>
            <Booking />
          </RequireRole>
        ),
      },
      {
        path: 'myappointments',
        element: (
          <RequireRole roles={['paciente']}>
            <MyAppointments />
          </RequireRole>
        ),
      },
      {
        path: 'staff/login',
        element: (
          <RedirectIfAuthenticated audience="staff">
            <StaffLogin />
          </RedirectIfAuthenticated>
        ),
      },
      {
        path: 'login',
        element: (
          <RedirectIfAuthenticated audience="client">
            <ClientLogin />
          </RedirectIfAuthenticated>
        ),
      },
      {
        path: 'register',
        element: (
          <RedirectIfAuthenticated audience="any">
            <ClientRegister />
          </RedirectIfAuthenticated>
        ),
      },
      {
        path: 'dashboard',
        element: (
          <RequireRole roles={STAFF_ROLES}>
            <Dashboard />
          </RequireRole>
        ),
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
