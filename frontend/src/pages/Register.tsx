import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { useAuth } from '../hooks/useAuth';

export const Register = () => {
  const { register, user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const passwordStrengthLabel = (password.length >= 8)
    ? (/[A-Z]/.test(password) && /\d/.test(password) ? 'Fuerte' : 'Media')
    : 'Débil';

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !password) {
      setError('Completá nombre, correo y contraseña.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña necesita al menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setSubmitting(true);
    try {
      await register({ name: name.trim(), email: email.trim(), phone: phone.trim(), password });
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dental-50">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full animate-slide-in-right">
        <h2 className="text-2xl font-bold text-dental-900 mb-6">Creá tu cuenta</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            id="reg-name"
            type="text"
            placeholder="Tu nombre completo"
            label="Nombre completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
          <Input
            id="reg-email"
            type="email"
            placeholder="correo@ejemplo.com"
            label="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <Input
            id="reg-phone"
            type="tel"
            placeholder="+54 9 11 ..."
            label="Teléfono (opcional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
          <Input
            id="reg-password"
            type="password"
            placeholder="••••••••"
            label="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          {password && (
            <p className="text-xs text-slate-500">Seguridad de la contraseña: {passwordStrengthLabel}</p>
          )}
          <Input
            id="reg-confirm"
            type="password"
            placeholder="Repetí la contraseña"
            label="Confirmar contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />

          {error && (
            <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
              {error}
            </p>
          )}

          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? 'Creando cuenta...' : 'Crear cuenta'}
          </Button>

          <p className="text-center text-sm text-slate-500">
            ¿Ya tenés cuenta?{' '}
            <a href="/login" className="font-semibold text-dental-600 hover:text-dental-800">Iniciá sesión</a>
          </p>
        </form>
      </div>
    </div>
  );
};

Register.displayName = 'Register';