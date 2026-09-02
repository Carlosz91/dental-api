import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LockKeyhole, UserPlus } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { useAuth } from '../hooks/useAuth';

export const ClientRegister = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await register({ name, email, phone, password });
      navigate('/booking', { replace: true });
    } catch (registerError: unknown) {
      setError(registerError instanceof Error ? registerError.message : 'No se pudo crear la cuenta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-76px)] px-4 py-12 sm:px-6 sm:py-20">
      <section className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700"><UserPlus className="h-6 w-6" /></span>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Crear cuenta de cliente</h1>
          <p className="mt-2 text-sm text-slate-500">Regístrate y agenda tu primera cita.</p>
        </div>
        <form className="grid gap-5" onSubmit={handleSubmit}>
          <Input label="Nombre completo" type="text" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} autoComplete="name" />
          <Input label="Teléfono" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} required minLength={8} autoComplete="tel" />
          <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
          <Input label="Contraseña" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete="new-password" />
          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{error}</p>}
          <Button type="submit" size="lg" disabled={isSubmitting} className="!w-full"><LockKeyhole className="h-4 w-4" />{isSubmitting ? 'Creando cuenta...' : 'Crear cuenta y continuar'}</Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">¿Ya tienes cuenta? <Link to="/login" className="font-semibold text-dental-700 hover:text-dental-800">Ingresar</Link></p>
      </section>
    </main>
  );
};

ClientRegister.displayName = 'ClientRegister';