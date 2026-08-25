import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { registerSchema } from '../lib/validations';
import { checkPasswordStrength } from '../lib/validations';

export const Register = () => {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [passwordStrength, setPasswordStrength] = useState<
    | 'weak'
    | 'medium'
    | 'strong'
  >('weak');

  const onSubmit = async (values: typeof registerSchema._type) => {
    try {
      await register(values.name, values.email, values.phone, values.password);
      navigate('/');
    } catch (error: any) {
      // Error handling
    }
  };

  // Validate on submit
  const validation = registerSchema.safeParse(formState);
  if (!validation.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dental-50">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full animate-slide-in-right">
          <h2 className="text-2xl font-bold text-dental-900 mb-6">Regístrate</h2>
          <form onSubmit={(e) => { e.preventDefault(); void onSubmit(formState); }} className="space-y-6">
            <Input
              id="name"
              placeholder="Nombre completo"
              label="Nombre completo"
              value={formState.name}
              onChange={(e) =>
                setFormState({ ...formState, name: e.target.value })
              }
            />
            <Input
              id="email"
              type="email"
              placeholder="correo@ejemplo.com"
              label="Correo electrónico"
              value={formState.email}
              onChange={(e) =>
                setFormState({ ...formState, email: e.target.value })
              }
            />
            <Input
              id="phone"
              type="tel"
              placeholder="+52 55 1234 5678"
              label="Teléfono"
              value={formState.phone}
              onChange={(e) =>
                setFormState({ ...formState, phone: e.target.value })
              }
            />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              label="Contraseña"
              value={formState.password}
              onChange={(e) => {
                setFormState({ ...formState, password: e.target.value });
                setPasswordStrength(checkPasswordStrength(e.target.value).level);
              }}
            />
            <div className="mt-2 text-dental-500 text-xs">
              {passwordStrength && checkPasswordStrength(formState.password).level === 'weak' && (
                <span>Mínimo 6 caracteres, incluye mayúsculas y números</span>
              )}
            </div>

            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              label="Confirmar contraseña"
              value={formState.confirmPassword}
              onChange={(e) =>
                setFormState({ ...formState, confirmPassword: e.target.value })
              }
            />
            {validation.error && (
              <p className="text-dental-600 text-sm mt-2">
                {validation.error.errors.map((e) => e.message).join('. ')}
              </p>
            )}
            <Button variant="primary" type="submit">
              Regístrate
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
        <h2 className="text-2xl font-bold text-dental-900 mb-6">Regístrate</h2>
        <form onSubmit={(e) => { e.preventDefault(); void onSubmit(formState); }} className="space-y-6">
          <Input
            id="name"
            placeholder="Nombre completo"
            label="Nombre completo"
            value={formState.name}
            onChange={(e) =>
              setFormState({ ...formState, name: e.target.value })
            }
          />
          <Input
            id="email"
            type="email"
            placeholder="correo@ejemplo.com"
            label="Correo electrónico"
            value={formState.email}
            onChange={(e) =>
              setFormState({ ...formState, email: e.target.value })
            }
          />
          <Input
            id="phone"
            type="tel"
            placeholder="+52 55 1234 5678"
            label="Teléfono"
            value={formState.phone}
            onChange={(e) =>
              setFormState({ ...formState, phone: e.target.value })
            }
          />
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            label="Contraseña"
            value={formState.password}
            onChange={(e) => {
              setFormState({ ...formState, password: e.target.value });
              setPasswordStrength(checkPasswordStrength(e.target.value).level);
            }}
          />
          <div className="mt-2 text-dental-500 text-xs">
            {passwordStrength && checkPasswordStrength(formState.password).level === 'weak' && (
              <span>Mínimo 6 caracteres, incluye mayúsculas y números</span>
            )}
          </div>

          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            label="Confirmar contraseña"
            value={formState.confirmPassword}
            onChange={(e) =>
              setFormState({ ...formState, confirmPassword: e.target.value })
            }
          />
          <Button variant="primary" type="submit">
            Regístrate
          </Button>
        </form>
      </div>
    </div>
  );
};

Register.displayName = 'Register';