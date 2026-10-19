import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LockKeyhole, UserRound } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { AuthCard } from '../components/common/AuthCard';
import { useAuth } from '../hooks/useAuth';
import { getRedirectFrom } from '../lib/auth-routing';

export const ClientLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(email, password);
      const authenticatedUser = useAuth.getState().user;
      if (!authenticatedUser || authenticatedUser.role !== 'paciente') {
        await logout();
        setError('Esta cuenta no es de cliente. Usa el acceso profesional.');
        return;
      }
      navigate(getRedirectFrom(location.state) ?? '/myappointments', { replace: true });
    } catch (loginError: unknown) {
      setError(loginError instanceof Error ? loginError.message : 'No se pudo iniciar sesión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard
      icon={UserRound}
      title="Acceso cliente"
      subtitle="Ingresa para consultar y gestionar tus citas."
      footer={
        <>
          <p>
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="font-semibold text-dental-900 underline underline-offset-2 hover:text-dental-800">Crear una</Link>
          </p>
          <p>
            <Link to="/" className="font-semibold text-dental-900 underline underline-offset-2 hover:text-dental-800">Volver al sitio público</Link>
          </p>
        </>
      }
    >
      <form className="grid gap-5" onSubmit={handleSubmit} aria-describedby={error ? 'login-error' : undefined}>
        <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="username" inputMode="email" />
        <Input label="Contraseña" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" />
        {error && (
          <p id="login-error" className="rounded-lg border border-red-300 bg-red-100 px-3 py-2 text-sm font-medium text-red-800" role="alert">{error}</p>
        )}
        <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
          <LockKeyhole className="h-4 w-4" aria-hidden="true" />{isSubmitting ? 'Ingresando...' : 'Ver mis citas'}
        </Button>
      </form>
    </AuthCard>
  );
};

ClientLogin.displayName = 'ClientLogin';
