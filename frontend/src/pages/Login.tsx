import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { useAuth } from '../hooks/useAuth';

export const Login = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Already authenticated -> go home (no side effects during render)
  if (user) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    // Client-side required check only fires AFTER the user tries to submit
    if (!email.trim() || !password.trim()) {
      setError('Ingresá tu correo y contraseña.');
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err: any) {
      setError(err?.message || 'No pudimos iniciar sesión. Verificá tus datos.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dental-50">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full animate-slide-in-right">
        <h2 className="text-2xl font-bold text-dental-900 mb-6">Iniciar sesión</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            id="email"
            type="email"
            placeholder="correo@ejemplo.com"
            label="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            label="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <div className="flex items-center justify-between">
            <label>
              <input
                type="checkbox"
                checked={showPassword}
                onChange={() => setShowPassword(!showPassword)}
                className="mr-2"
              />
              Mostrar contraseña
            </label>
          </div>

          {/* Errors appear only after a submit attempt */}
          {error && (
            <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
              {error}
            </p>
          )}

          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  );
};

Login.displayName = 'Login';