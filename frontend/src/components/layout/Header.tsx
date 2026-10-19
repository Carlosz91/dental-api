import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ClipboardList, LogOut, Menu, Stethoscope, X } from 'lucide-react';
import { CornerLogo } from '../common/CornerLogo';
import { useAuth } from '../../hooks/useAuth';
import { isStaffRole } from '../../lib/auth-routing';

const desktopLink = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-[44px] items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors hover:bg-dental-50 hover:text-dental-900 ${
    isActive ? 'bg-dental-50 text-dental-900' : 'text-slate-700'
  }`;

const mobileLink = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-[48px] items-center gap-2 rounded-xl px-4 py-3 font-semibold ${
    isActive ? 'bg-dental-100 text-dental-900' : 'bg-dental-50 text-dental-900'
  }`;

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const closeMenu = () => setIsMenuOpen(false);

  // Close the mobile menu with Escape (links close it on click)
  useEffect(() => {
    if (!isMenuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMenuOpen]);

  const handleLogout = async () => {
    // Navigate first so route guards don't bounce the user to a login page
    closeMenu();
    navigate('/');
    try {
      await logout();
    } catch {
      // El store ya limpia el estado local aunque el API falle
    }
  };

  const firstName = (user?.name ?? '').trim().split(' ')[0] || 'usuario';
  const staff = isStaffRole(user?.role);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-lg">
      <div className="relative mx-auto flex min-h-[76px] max-w-7xl items-center justify-center px-4 py-2 sm:px-6">
        {/* Logo section */}
        <Link to="/" className="flex min-w-0 flex-col items-center rounded-lg leading-none" onClick={closeMenu} aria-label="DentalCare, ir al inicio">
          <span className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">DentalCare</span>
          <CornerLogo className="mt-1 h-6 w-6 rounded-lg shadow-sm" />
        </Link>

        {/* Desktop navigation */}
        <nav aria-label="Principal" className="absolute right-4 hidden items-center gap-2 md:flex sm:right-6">
          {user ? (
            <>
              {staff && (
                <NavLink to="/dashboard" className={desktopLink}>
                  <Stethoscope className="h-4 w-4" aria-hidden="true" /> Panel
                </NavLink>
              )}
              {user.role === 'paciente' && (
                <NavLink to="/myappointments" className={desktopLink}>
                  <ClipboardList className="h-4 w-4" aria-hidden="true" /> Mis citas
                </NavLink>
              )}
              <span className="px-1 text-sm font-medium text-slate-700">Hola, {firstName}</span>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-dental-800 px-3 py-2 text-sm font-semibold text-dental-900 transition-colors hover:bg-dental-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dental-800 focus-visible:ring-offset-2"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" /> Salir
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={desktopLink}>
                <ClipboardList className="h-4 w-4" aria-hidden="true" /> Mis citas
              </NavLink>
              <NavLink to="/staff/login" className={desktopLink}>
                <Stethoscope className="h-4 w-4" aria-hidden="true" /> Panel
              </NavLink>
            </>
          )}
        </nav>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="absolute right-4 flex h-11 w-11 items-center justify-center rounded-xl text-dental-900 hover:bg-dental-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dental-800 md:hidden sm:right-6"
          aria-controls="mobile-menu"
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          {isMenuOpen ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
        </button>
      </div>

      {/* Mobile menu */}
      {isMenuOpen ? (
        <nav
          id="mobile-menu"
          aria-label="Principal (móvil)"
          className="fixed left-0 right-0 top-[76px] z-50 max-h-[calc(100vh-76px)] overflow-y-auto border-t border-dental-200 bg-white p-4 shadow-lg md:hidden"
        >
          {user ? (
            <div className="grid gap-2">
              <p className="px-1 pb-1 text-sm font-medium text-slate-700">Hola, {firstName}</p>
              {staff && (
                <NavLink to="/dashboard" onClick={closeMenu} className={mobileLink}>
                  <Stethoscope className="h-4 w-4" aria-hidden="true" /> Panel
                </NavLink>
              )}
              {user.role === 'paciente' && (
                <NavLink to="/myappointments" onClick={closeMenu} className={mobileLink}>
                  <ClipboardList className="h-4 w-4" aria-hidden="true" /> Mis citas
                </NavLink>
              )}
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-dental-800 px-4 py-3 font-semibold text-dental-900 transition-colors hover:bg-dental-50"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" /> Salir
              </button>
            </div>
          ) : (
            <div className="grid gap-2">
              <NavLink to="/login" onClick={closeMenu} className={mobileLink}>
                <ClipboardList className="h-4 w-4" aria-hidden="true" /> Mis citas
              </NavLink>
              <NavLink to="/staff/login" onClick={closeMenu} className={mobileLink}>
                <Stethoscope className="h-4 w-4" aria-hidden="true" /> Panel
              </NavLink>
            </div>
          )}
        </nav>
      ) : null}
    </header>
  );
};

Header.displayName = 'Header';
