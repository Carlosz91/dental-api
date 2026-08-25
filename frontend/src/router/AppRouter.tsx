import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { Home } from '../pages/Home';
import { Login } from '../pages/Login';
import { Register } from '../pages/Register';
import { Specialists } from '../pages/Specialists';
import { SpecialistDetail } from '../pages/SpecialistDetail';
import { Booking } from '../pages/Booking';
import { MyAppointments } from '../pages/MyAppointments';
import { NotFound } from '../pages/NotFound';
import { useAuth } from '../hooks/useAuth';

/**
 * Protected Route component that checks authentication
 * Redirects to login if not authenticated
 */
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Cargando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

/**
 * Public Route component that redirects to home if already authenticated
 */
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

/**
 * Main router configuration
 * Defines all routes and their components
 */
export const AppRouter = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      {
        path: '',
        element: <Home />,
      },
      {
        path: 'login',
        element: <PublicRoute><Login /></PublicRoute>,
      },
      {
        path: 'register',
        element: <PublicRoute><Register /></PublicRoute>,
      },
      {
        path: 'specialists',
        element: <Specialists />,
      },
      {
        path: 'specialist/:id',
        element: <SpecialistDetail />,
      },
      {
        path: 'booking',
        element: <ProtectedRoute><Booking /></ProtectedRoute>,
      },
      {
        path: 'myappointments',
        element: <ProtectedRoute><MyAppointments /></ProtectedRoute>,
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
]);