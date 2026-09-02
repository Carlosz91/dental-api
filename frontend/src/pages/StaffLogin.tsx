import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LockKeyhole, Stethoscope } from 'lucide-react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { useAuth } from '../hooks/useAuth';

const ALLOWED_ROLES = ['especialista', 'staff', 'admin'];

export const StaffLogin = () => {
	const navigate = useNavigate();
	const { user, login, logout } = useAuth();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		if (user && ALLOWED_ROLES.includes(user.role ?? '')) navigate('/dashboard', { replace: true });
	}, [navigate, user]);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError('');
		setIsSubmitting(true);
		try {
			await login(email, password);
			const authenticatedUser = useAuth.getState().user;
			if (!authenticatedUser || !ALLOWED_ROLES.includes(authenticatedUser.role ?? '')) {
				await logout();
				setError('Esta cuenta no tiene permisos de acceso profesional.');
				return;
			}
			navigate('/dashboard', { replace: true });
		} catch (loginError: unknown) {
			setError(loginError instanceof Error ? loginError.message : 'No se pudo iniciar sesión.');
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<main className="min-h-[calc(100vh-76px)] px-4 py-12 sm:px-6 sm:py-20">
			<section className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
				<div className="mb-8 text-center">
					<span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-dental-50 text-dental-700"><Stethoscope className="h-6 w-6" /></span>
					<h1 className="mt-4 text-2xl font-bold text-slate-900">Acceso profesional</h1>
					<p className="mt-2 text-sm text-slate-500">Ingresá para gestionar tu agenda.</p>
				</div>
				<form className="grid gap-5" onSubmit={handleSubmit}>
					<Input label="Email profesional" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="username" />
					<Input label="Contraseña" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" />
					{error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{error}</p>}
					<Button type="submit" size="lg" disabled={isSubmitting} className="!w-full"><LockKeyhole className="h-4 w-4" />{isSubmitting ? 'Ingresando...' : 'Ingresar al panel'}</Button>
				</form>
				<p className="mt-6 text-center text-sm text-slate-500"><Link to="/" className="font-semibold text-dental-700 hover:text-dental-800">Volver al sitio público</Link></p>
			</section>
		</main>
	);
};

StaffLogin.displayName = 'StaffLogin';
