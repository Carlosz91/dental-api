import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ClipboardList, LogIn, Menu, UserPlus, X } from 'lucide-react';
import { CornerLogo } from '../common/CornerLogo';
import { useAuth } from '../../hooks/useAuth';

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user } = useAuth();
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-lg">
      <div className="relative mx-auto flex min-h-[76px] max-w-7xl items-center justify-center px-4 py-2 sm:px-6">

        {/* Logo section */}
        <Link to="/" className="flex min-w-0 flex-col items-center leading-none" onClick={closeMenu}>
          <span className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">DentalCare</span>
          <CornerLogo className="mt-1 h-6 w-6 rounded-lg shadow-sm" />
        </Link>

        {/* Desktop navigation */}
        <div className="absolute right-4 hidden items-center gap-2 md:flex sm:right-6">
          {user ? (
            <div className="flex items-center gap-2">
              <Link to="/booking" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-dental-700 hover:bg-dental-50">
                <CalendarDays className="h-4 w-4" /> Agendar cita
              </Link>
              <Link to="/myappointments" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-dental-700 hover:bg-dental-50">
                <ClipboardList className="h-4 w-4" /> Mis citas
              </Link>
              <span className="px-3 text-sm text-slate-500">Hola, {user.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-dental-700 hover:bg-dental-50">
                <LogIn className="h-4 w-4" /> Iniciar sesión
              </Link>
              <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-dental-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-dental-600">
                <UserPlus className="h-4 w-4" /> Crear cuenta
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="absolute right-4 rounded-xl p-2 text-dental-700 hover:bg-dental-50 md:hidden sm:right-6"
          aria-controls="mobile-menu"
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {isMenuOpen ? (
        <nav id="mobile-menu" className="fixed top-[76px] left-0 right-0 z-50 max-h-screen overflow-y-auto border-t border-dental-200 bg-white p-6 shadow-lg">
          <Link to="/" onClick={closeMenu} className="mb-4 block text-lg font-semibold text-dental-700">
            DentalCare
          </Link>

          {user ? (
            <div className="grid gap-2 border-b border-dental-100 pb-5">
              <Link to="/booking" onClick={closeMenu} className="flex items-center gap-2 rounded-xl bg-dental-50 px-4 py-3 font-semibold text-dental-700">
                <CalendarDays className="h-4 w-4" /> Agendar cita
              </Link>
              <Link to="/myappointments" onClick={closeMenu} className="flex items-center gap-2 rounded-xl px-4 py-3 font-semibold text-dental-700 hover:bg-dental-50">
                <ClipboardList className="h-4 w-4" /> Mis citas
              </Link>
            </div>
          ) : (
            <div className="grid gap-2 border-t border-dental-100 pt-5">
              <Link to="/login" onClick={closeMenu} className="flex items-center justify-center gap-2 rounded-xl border border-dental-200 px-4 py-3 font-semibold text-dental-700">
                <LogIn className="h-4 w-4" /> Iniciar sesión
              </Link>
              <Link to="/register" onClick={closeMenu} className="flex items-center justify-center gap-2 rounded-xl bg-dental-500 px-4 py-3 font-semibold text-white">
                <UserPlus className="h-4 w-4" /> Crear cuenta
              </Link>
            </div>
          )}
        </nav>
      ) : null}
    </header>
  );
};

Header.displayName = 'Header';