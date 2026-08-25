import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { loginSchema } from '../lib/validations';

export const Login = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [formState, setFormState] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (values: typeof loginSchema._type) => {
    try {
      await login(values.email, values.password);
      navigate('/');
    } catch (error: any) {
      // Error shown in component
    }
  };

  // Validate on submit
  const validation = loginSchema.safeParse(formState);
  if (!validation.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dental-50">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full animate-slide-in-right">
          <h2 className="text-2xl font-bold text-dental-900 mb-6">Iniciar sesión</h2>
          <form onSubmit={(e) => { e.preventDefault(); void onSubmit(formState); }} className="space-y-4">
            <Input
              id="email"
              type="email"
              placeholder="correo@ejemplo.com"
              label="Correo electrónico"
              value={formState.email}
              onChange={(e) => setFormState({ ...formState, email: e.target.value })}
            />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              label="Contraseña"
              value={formState.password}
              onChange={(e) =>
                setFormState({ ...formState, password: e.target.value })
              }
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
            {validation.error && (
              <p className="text-dental-600 text-sm">{validation.error.errors[0].message}</p>
            )}
            <Button variant="primary" type="submit">
              Entrar
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // If already logged in, redirect to home
  if (user) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dental-50">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full animate-slide-in-right">
        <h2 className="text-2xl font-bold text-dental-900 mb-6">Iniciar sesión</h2>
        <form onSubmit={(e) => { e.preventDefault(); void onSubmit(formState); }} className="space-y-4">
          <Input
            id="email"
            type="email"
            placeholder="correo@ejemplo.com"
            label="Correo electrónico"
            value={formState.email}
            onChange={(e) => setFormState({ ...formState, email: e.target.value })}
          />
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            label="Contraseña"
            value={formState.password}
            onChange={(e) =>
              setFormState({ ...formState, password: e.target.value })
            }
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
          <Button variant="primary" type="submit">
            Entrar
          </Button>
        </form>
      </div>
    </div>
  );
};

Login.displayName = 'Login';

// Demo credentials for testing
Login.credentials = {
  email: 'paciente@test.com',
  password: 'password123',
};