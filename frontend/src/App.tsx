import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

/**
 * App raíz - Protegido y con Layout dental
 * - Si el usuario no está autenticado y va a rutas protegidas, redirige al login
 * - Si el usuario está autenticado y va a login/register, redirige al home
 * - Usa el Layout dental con CornerLogo, Header y Footer
 */
export default function App() {
  const { user, isLoading } = useAuth();

  // Mientras se carga el auth, muestra la pantalla por defecto de Vite
  if (isLoading) {
    return (
      <div className="min-h-screen bg-dental-50 flex items-center justify-center">
        <div className="text-dental-500">Cargando...</div>
      </div>
    );
  }

  // Si el usuario no tiene rol asignado, permite navegar libremente
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Usuario autenticado: usar el Layout dental
  return (
    <Outlet />
  );
}