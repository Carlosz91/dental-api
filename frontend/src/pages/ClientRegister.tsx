import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LockKeyhole, UserPlus } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { AuthCard } from '../components/common/AuthCard';
import { useAuth } from '../hooks/useAuth';

type Field = 'name' | 'phone' | 'email' | 'password';
type FieldErrors = Partial<Record<Field, string>>;

function validate(values: Record<Field, string>): FieldErrors {
  const errors: FieldErrors = {};
  if (values.name.trim().length < 2) errors.name = 'Ingresa tu nombre completo (mínimo 2 caracteres).';
  if (values.phone.trim().length < 8) errors.phone = 'Ingresa un teléfono de contacto (mínimo 8 caracteres).';
  if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) errors.email = 'Ingresa un email válido, por ejemplo nombre@correo.com.';
  if (values.password.length < 8) errors.password = 'La contraseña debe tener al menos 8 caracteres.';
  return errors;
}

export const ClientRegister = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [values, setValues] = useState<Record<Field, string>>({ name: '', phone: '', email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const setField = (field: Field) => (event: ChangeEvent<HTMLInputElement>) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    if (fieldErrors[field]) setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const errors = validate(values);
    setFieldErrors(errors);
    const firstInvalid = (Object.keys(errors) as Field[])[0];
    if (firstInvalid) {
      formRef.current?.querySelector<HTMLInputElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      await register({ name: values.name.trim(), email: values.email.trim(), phone: values.phone.trim(), password: values.password });
      navigate('/booking', { replace: true });
    } catch (registerError: unknown) {
      setError(registerError instanceof Error ? registerError.message : 'No se pudo crear la cuenta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard
      icon={UserPlus}
      title="Crear cuenta de cliente"
      subtitle="Regístrate y agenda tu primera cita."
      footer={
        <p>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-semibold text-dental-900 underline underline-offset-2 hover:text-dental-800">Ingresar</Link>
        </p>
      }
    >
      <form ref={formRef} className="grid gap-5" onSubmit={handleSubmit} noValidate>
        <Input name="name" label="Nombre completo" type="text" value={values.name} onChange={setField('name')} required autoComplete="name" error={fieldErrors.name} />
        <Input name="phone" label="Teléfono" type="tel" value={values.phone} onChange={setField('phone')} required autoComplete="tel" inputMode="tel" error={fieldErrors.phone} />
        <Input name="email" label="Email" type="email" value={values.email} onChange={setField('email')} required autoComplete="email" inputMode="email" error={fieldErrors.email} />
        <Input name="password" label="Contraseña" type="password" value={values.password} onChange={setField('password')} required autoComplete="new-password" hint="Mínimo 8 caracteres." error={fieldErrors.password} />
        {error && (
          <p className="rounded-lg border border-red-300 bg-red-100 px-3 py-2 text-sm font-medium text-red-800" role="alert">{error}</p>
        )}
        <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
          <LockKeyhole className="h-4 w-4" aria-hidden="true" />{isSubmitting ? 'Creando cuenta...' : 'Crear cuenta y continuar'}
        </Button>
      </form>
    </AuthCard>
  );
};

ClientRegister.displayName = 'ClientRegister';
